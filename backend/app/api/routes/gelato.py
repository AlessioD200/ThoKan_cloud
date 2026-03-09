import base64
import re

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models import SystemSetting, User
from app.services.encryption import decrypt_bytes, encrypt_bytes

router = APIRouter()


def _gelato_key(user_id: str) -> str:
    return f"gelato:{user_id}"


def _shopify_key(user_id: str) -> str:
    return f"shopify:{user_id}"


def _normalize_shop_domain(value: str) -> str:
    domain = (value or "").strip().lower()
    domain = re.sub(r"^https?://", "", domain)
    domain = domain.split("/")[0]
    return domain


def _get_raw_config(db: Session, key: str) -> dict | None:
    row = db.get(SystemSetting, key)
    return row.value if row else None


def _save_config(db: Session, key: str, user_id: str, value: dict) -> None:
    row = db.get(SystemSetting, key)
    if not row:
        row = SystemSetting(key=key, value=value, updated_by=user_id)
        db.add(row)
    else:
        row.value = value
        row.updated_by = user_id
    db.commit()


def _decrypt_secret(raw: dict, enc_key: str, iv_key: str) -> str:
    encrypted_b64 = raw.get(enc_key)
    iv = raw.get(iv_key)
    if not encrypted_b64 or not iv:
        return ""
    encrypted = base64.b64decode(encrypted_b64.encode("utf-8"))
    return decrypt_bytes(encrypted, iv).decode("utf-8")


def _encrypt_secret(value: str) -> tuple[str, str]:
    encrypted, iv = encrypt_bytes(value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8"), iv


def _gelato_request(raw: dict, method: str, path: str, params: dict | None = None, payload: dict | None = None) -> dict:
    api_key = _decrypt_secret(raw, "api_key_enc", "api_key_iv")
    base_url = (raw.get("base_url") or "https://order.gelatoapis.com").rstrip("/")
    if not api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gelato API key not configured")

    url = f"{base_url}/v4/{path.lstrip('/')}"
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}

    with httpx.Client(timeout=30.0) as client:
        response = client.request(method=method.upper(), url=url, params=params or {}, json=payload, headers=headers)

    if response.status_code >= 400:
        detail = response.text[:500]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gelato API error ({response.status_code}): {detail}",
        )

    if not response.content:
        return {}
    return response.json()


def _shopify_order_for_user(db: Session, user_id: str, order_id: str) -> dict:
    raw = _get_raw_config(db, _shopify_key(user_id))
    if not raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shopify config not found")

    domain = _normalize_shop_domain(raw.get("store_domain") or "")
    api_version = raw.get("api_version") or "2024-10"
    token = _decrypt_secret(raw, "access_token_enc", "access_token_iv")
    if not domain or not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incomplete Shopify configuration")

    url = f"https://{domain}/admin/api/{api_version}/orders/{order_id}.json"
    headers = {"X-Shopify-Access-Token": token, "Content-Type": "application/json"}

    with httpx.Client(timeout=20.0) as client:
        response = client.get(url, params={"status": "any"}, headers=headers)

    if response.status_code >= 400:
        detail = response.text[:400]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shopify API error ({response.status_code}): {detail}",
        )

    payload = response.json()
    order = payload.get("order")
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.get("/config")
def get_gelato_config(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    raw = _get_raw_config(db, _gelato_key(str(current_user.id))) or {}
    return {
        "base_url": raw.get("base_url", "https://order.gelatoapis.com"),
        "has_api_key": bool(raw.get("api_key_enc") and raw.get("api_key_iv")),
        "sku_map": raw.get("sku_map", {}),
    }


@router.put("/config")
def save_gelato_config(payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(current_user.id)
    raw = _get_raw_config(db, _gelato_key(user_id)) or {}
    base_url = (payload.get("base_url") or raw.get("base_url") or "https://order.gelatoapis.com").strip()
    api_key = (payload.get("api_key") or "").strip()
    sku_map = payload.get("sku_map") if isinstance(payload.get("sku_map"), dict) else raw.get("sku_map") or {}

    api_key_enc = raw.get("api_key_enc")
    api_key_iv = raw.get("api_key_iv")
    if api_key:
        api_key_enc, api_key_iv = _encrypt_secret(api_key)

    data = {
        "base_url": base_url,
        "api_key_enc": api_key_enc,
        "api_key_iv": api_key_iv,
        "sku_map": sku_map,
    }
    _save_config(db, _gelato_key(user_id), user_id, data)
    return {"message": "Gelato configuration saved"}


@router.get("/catalog")
def gelato_catalog(
    limit: int = Query(default=20, ge=1, le=100),
    page: int = Query(default=1, ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raw = _get_raw_config(db, _gelato_key(str(current_user.id)))
    if not raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gelato config not found")
    return _gelato_request(raw, "GET", "products", params={"limit": limit, "page": page})


@router.post("/prices")
def gelato_prices(payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    raw = _get_raw_config(db, _gelato_key(str(current_user.id)))
    if not raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gelato config not found")
    return _gelato_request(raw, "POST", "price", payload=payload)


@router.post("/orders")
def gelato_create_order(payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    raw = _get_raw_config(db, _gelato_key(str(current_user.id)))
    if not raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gelato config not found")
    return _gelato_request(raw, "POST", "orders", payload=payload)


@router.post("/orders/from-shopify/{order_id}")
def gelato_create_from_shopify(order_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(current_user.id)
    gelato_raw = _get_raw_config(db, _gelato_key(user_id))
    if not gelato_raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gelato config not found")

    order = _shopify_order_for_user(db, user_id, order_id)
    sku_map = gelato_raw.get("sku_map") or {}

    shipping = order.get("shipping_address") or {}
    customer = order.get("customer") or {}
    email = order.get("email") or customer.get("email") or ""

    order_items = []
    missing_skus: list[str] = []
    for line in order.get("line_items") or []:
        sku = (line.get("sku") or "").strip()
        if not sku or sku not in sku_map:
            missing_skus.append(sku or "<empty>")
            continue
        order_items.append(
            {
                "productUid": sku_map[sku],
                "quantity": int(line.get("quantity") or 1),
                "files": [],
            }
        )

    if not order_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No order items could be mapped to Gelato products. "
                "Add SKU mapping in Settings > Gelato Integration. "
                f"Missing SKUs: {', '.join(missing_skus[:20])}"
            ),
        )

    gelato_payload = {
        "orderType": "order",
        "externalId": f"shopify-{order.get('id')}",
        "customerReference": order.get("name") or str(order.get("id") or ""),
        "currency": order.get("currency") or "USD",
        "items": order_items,
        "recipient": {
            "email": email,
            "phone": shipping.get("phone") or "",
            "firstName": shipping.get("first_name") or customer.get("first_name") or "",
            "lastName": shipping.get("last_name") or customer.get("last_name") or "",
            "address": {
                "line1": shipping.get("address1") or "",
                "line2": shipping.get("address2") or "",
                "city": shipping.get("city") or "",
                "state": shipping.get("province") or "",
                "postalCode": shipping.get("zip") or "",
                "country": shipping.get("country_code") or shipping.get("country") or "",
            },
        },
        "metadata": {
            "source": "shopify",
            "shopifyOrderId": str(order.get("id") or ""),
            "shopifyOrderName": order.get("name") or "",
        },
    }

    response = _gelato_request(gelato_raw, "POST", "orders", payload=gelato_payload)
    return {
        "message": "Order sent to Gelato",
        "gelato_response": response,
        "unmapped_skus": missing_skus,
    }