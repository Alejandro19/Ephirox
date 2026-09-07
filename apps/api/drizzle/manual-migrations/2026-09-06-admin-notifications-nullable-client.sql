-- admin_notifications.client_id pasa a ser nullable: la alarma de nuevos
-- leads de la landing (type:'enterprise_lead') no tiene ningún cliente al
-- que referenciar. NotificationBell.tsx ya toleraba esto en el frontend.
ALTER TABLE admin_notifications ALTER COLUMN client_id DROP NOT NULL;
