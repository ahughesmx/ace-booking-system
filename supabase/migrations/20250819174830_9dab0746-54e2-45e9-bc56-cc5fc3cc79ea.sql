-- Crear Rodrigo usando auth.admin.createUser simulación
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '12345678-abcd-ef12-3456-789012345678',
    'authenticated',
    'authenticated', 
    'rbaldomar@gmail.com',
    crypt('Abc12345', gen_salt('bf')),
    now(),
    now(), 
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"member_id": "422", "full_name": "Rodrigo Baldomar", "phone": "2299152465"}',
    false
);

INSERT INTO profiles (id, member_id, full_name, phone)
VALUES ('12345678-abcd-ef12-3456-789012345678', '422', 'Rodrigo Baldomar', '2299152465');

INSERT INTO user_roles (user_id, role)  
VALUES ('12345678-abcd-ef12-3456-789012345678', 'user');