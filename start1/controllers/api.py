import tempfile

# Cloud-safe of uuid, so that many cloned servers do not all use the same uuids.
from gluon.utils import web2py_uuid

# Here go your api methods.
@auth.requires_login()
def get_user_images():
    start_idx = int(request.vars.start_idx) if request.vars.start_idx is not None else 0
    end_idx = int(request.vars.end_idx) if request.vars.end_idx is not None else 0
    user_images = []
    rows = db(db.user_images.user_email == auth.user.email).select(db.user_images.ALL)
    for i, r in enumerate(rows):
        if i < end_idx - start_idx:
            image = dict(
                id = r.id,
                created_on = r.created_on,
                created_by = r.created_by,
                image_url = r.image_url,
                price = r.price,
                is_incart=r.is_incart
            )
            user_images.append(image)
    return response.json(dict(
        user_images=user_images,
    ))
    
@auth.requires_login()
def get_images_from_current_user():
    user_images = []
    logger.info(request.vars.other_user)
    user = request.vars.other_user
    rows = db((db.user_images.user_email == user)).select(db.user_images.ALL) 
    for i, r in enumerate(rows):
            image = dict(
                id = r.id,
                created_on = r.created_on,
                created_by = r.created_by,
                image_url = r.image_url,
                price = r.price,
                is_incart=r.is_incart
            )
            user_images.append(image)
    return response.json(dict(
        user_images=user_images,
    ))

@auth.requires_login()
def get_images_from_other_user():
    user_images = []
    logger.info(request.vars.other_user)
    user = request.vars.other_user
    rows = db((db.user_images.user_email == user)).select(db.user_images.ALL) 
    for i, r in enumerate(rows):
            image = dict(
                id = r.id,
                created_on = r.created_on,
                created_by = r.created_by,
                image_url = r.image_url,
                price = r.price,
                is_incart=r.is_incart
            )
            user_images.append(image)
    return response.json(dict(
        user_images=user_images,
    ))


@auth.requires_login()
@auth.requires_signature()
def add_image():
    image_id = db.user_images.insert(
        image_url = request.vars.image_url,
        price = request.vars.price
    )
    im = db.user_images(image_id)
    user_images = dict(
        id=im.id,
        image_url=request.vars.image_url,
        price =request.vars.price,
    )

    return response.json(dict(user_images=user_images
    ))

@auth.requires_login()
def add_cart():
    m = db((db.user_images.id == request.vars.image_id)).select().first()
    if m is not None:
        m.update_record(is_incart = request.vars.is_incart)
        return "ok"
    else:
        return "fail"

@auth.requires_login()
def out_cart():
    m = db((db.user_images.id == request.vars.image_id)).select().first()
    if m is not None:
        m.update_record(is_incart = request.vars.is_incart)
        return "ok"
    else:
        return "fail"

@auth.requires_login()
def get_users():
    start_idx = int(request.vars.start_idx) if request.vars.start_idx is not None else 0
    end_idx = int(request.vars.end_idx) if request.vars.end_idx is not None else 0
    auth_user = []
    #has_more = False 
    rows = db(db.auth_user.id > 0).select(db.auth_user.ALL) 
    for i, r in enumerate(rows):
        if i < end_idx - start_idx:
            users = dict(
                first_name = r.first_name,
                last_name = r.last_name,
                email = r.email,
                user_id = r.id
            )
            auth_user.append(users)
    return response.json(dict(
        auth_user=auth_user,
    ))

@auth.requires_login()
@auth.requires_signature()
def set_price():
    m = db((db.user_images.id == request.vars.image_id) & (db.user_images.user_email == auth.user.email)).select().first()
    if (m is not None) and (db.user_images.user_email == auth.user.email):
        m.update_record(price = request.vars.price)
        return "ok"
    else:
        return "fail"

def purchase():
    """Ajax function called when a customer orders and pays for the cart."""
    if not URL.verify(request, hmac_key=session.hmac_key):
        raise HTTP(500)
    # Creates the charge.
    import stripe
    # Your secret key.
    stripe.api_key = myconf.get('stripe.private_key')
    token = json.loads(request.vars.transaction_token)
    amount = float(request.vars.amount)
    try:
        charge = stripe.Charge.create(
            amount=int(amount * 100),
            currency="usd",
            source=token['id'],
            description="Purchase",
        )
    except stripe.error.CardError as e:
        logger.info("The card has been declined.")
        logger.info("%r" % traceback.format_exc())
        return response.json(dict(result="nok"))
    db.customer_order.insert(
        customer_info=request.vars.customer_info,
        transaction_token=json.dumps(token),
        )
    return response.json(dict(result="nok"))

