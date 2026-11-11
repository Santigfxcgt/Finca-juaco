-- =====================================================================================
-- ARQUITECTURA DE BASE DE DATOS MYSQL 8.0+ (DDL + DML + TRIGGERS + VISTAS)
-- PROYECTO: Sistema de Gestión y Reservas - Finca Hotel Don Juaco (Finca La Colmena)
-- MOTOR: InnoDB | CHARSET: utf8mb4 | COLLATE: utf8mb4_unicode_ci
-- COMPATIBLE CON: MySQL Workbench 8.0+ / MySQL Server 8.0+ / MariaDB 10.5+
-- =====================================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -------------------------------------------------------------------------------------
-- 1. CREACIÓN DE LA BASE DE DATOS
-- -------------------------------------------------------------------------------------
DROP DATABASE IF EXISTS `Finca don Joaco`;
CREATE DATABASE IF NOT EXISTS `Finca don Joaco`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `Finca don Joaco`;

-- =====================================================================================
-- SECCIÓN I: DDL (DATA DEFINITION LANGUAGE) - ESTRUCTURA DE TABLAS Y SECUENCIAS
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- TABLA 1: system_sequences
-- Propósito: Emular y controlar las secuencias del proyecto (room-X, guest-X, res-X,
--            tx-X y códigos de reserva COL-2026-XXXX) de forma transaccional en MySQL.
-- -------------------------------------------------------------------------------------
CREATE TABLE `system_sequences` (
  `sequence_name` VARCHAR(50) NOT NULL,
  `prefix` VARCHAR(20) NOT NULL,
  `current_value` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `step` INT UNSIGNED NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sequence_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- TABLA 2: admin_users
-- Propósito: Credenciales y perfiles de administración del panel operativo.
-- -------------------------------------------------------------------------------------
CREATE TABLE `admin_users` (
  `seq_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id` VARCHAR(50) NOT NULL,
  `username` VARCHAR(60) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Contraseña del panel (ej. admin123)',
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `role` ENUM('SUPERADMIN', 'ADMIN', 'RECEPTIONIST', 'AUDITOR') NOT NULL DEFAULT 'ADMIN',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_seq_id` (`seq_id`),
  UNIQUE KEY `uk_admin_username` (`username`),
  UNIQUE KEY `uk_admin_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- TABLA 3: settings
-- Propósito: Configuración global de la Finca Hotel, datos bancarios y reglas de negocio.
-- -------------------------------------------------------------------------------------
CREATE TABLE `settings` (
  `id` VARCHAR(50) NOT NULL DEFAULT 'colmena_settings',
  `property_name` VARCHAR(150) NOT NULL DEFAULT 'Finca La Colmena de Don Juaco',
  `tagline` VARCHAR(200) NOT NULL DEFAULT 'Alojamiento Campestre & Agroturismo Tradicional',
  `phone` VARCHAR(40) NOT NULL DEFAULT '+57 301 567 7776',
  `email` VARCHAR(150) NOT NULL DEFAULT 'restreporojassantiago940@gmail.com',
  `whatsapp_number` VARCHAR(30) NOT NULL DEFAULT '573015677776',
  `location_address` TEXT NOT NULL,
  `check_in_time` VARCHAR(10) NOT NULL DEFAULT '15:00',
  `check_out_time` VARCHAR(10) NOT NULL DEFAULT '11:00',
  `default_min_stay_nights` INT UNSIGNED NOT NULL DEFAULT 1,
  `payment_hold_minutes` INT UNSIGNED NOT NULL DEFAULT 25,
  `cancellation_penalty_percent` DECIMAL(5,2) NOT NULL DEFAULT 50.00 COMMENT 'Cargo del 50% del anticipo por cancelación o inasistencia',
  `bancolombia_account_type` VARCHAR(50) NOT NULL DEFAULT 'Cuenta de Ahorros',
  `bancolombia_account_number` VARCHAR(50) NOT NULL DEFAULT '482-901842-19',
  `bancolombia_holder_name` VARCHAR(150) NOT NULL DEFAULT 'Joaquín Emilio Restrepo / Finca La Colmena',
  `bancolombia_nit` VARCHAR(40) NOT NULL DEFAULT '901.482.190-4',
  `nequi_number` VARCHAR(30) NOT NULL DEFAULT '3015677776',
  `daviplata_number` VARCHAR(30) NOT NULL DEFAULT '3015677776',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- TABLA 4: rooms
-- Propósito: Inventario de las 7 habitaciones campestres de la finca.
-- -------------------------------------------------------------------------------------
CREATE TABLE `rooms` (
  `seq_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Secuencia numérica interna',
  `id` VARCHAR(50) NOT NULL COMMENT 'ID de negocio (room-1 .. room-7)',
  `room_number` VARCHAR(30) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `capacity` INT UNSIGNED NOT NULL DEFAULT 2,
  `base_price` DECIMAL(12,2) NOT NULL DEFAULT 85000.00 COMMENT 'Precio base temporada regular en COP',
  `out_of_service` TINYINT(1) NOT NULL DEFAULT 0,
  `out_of_service_reason` TEXT NULL DEFAULT NULL,
  `bed_type` VARCHAR(120) NOT NULL,
  `view_type` VARCHAR(120) NOT NULL,
  `square_meters` INT UNSIGNED NOT NULL DEFAULT 28,
  `amenities` JSON NOT NULL COMMENT 'Arreglo JSON de comodidades',
  `images` JSON NOT NULL COMMENT 'Arreglo JSON de rutas de fotografías reales',
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rooms_seq_id` (`seq_id`),
  UNIQUE KEY `uk_rooms_room_number` (`room_number`),
  UNIQUE KEY `uk_rooms_slug` (`slug`),
  INDEX `idx_rooms_out_of_service` (`out_of_service`),
  INDEX `idx_rooms_capacity` (`capacity`),
  INDEX `idx_rooms_base_price` (`base_price`),
  INDEX `idx_rooms_sort_order` (`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- TABLA 5: experiences
-- Propósito: Zonas sociales y experiencias agroturísticas de la finca.
-- -------------------------------------------------------------------------------------
CREATE TABLE `experiences` (
  `seq_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(150) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `short_description` VARCHAR(300) NOT NULL,
  `full_description` TEXT NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `default_image_url` VARCHAR(255) NOT NULL,
  `included_in_stay` TINYINT(1) NOT NULL DEFAULT 1,
  `schedule_info` VARCHAR(120) NULL DEFAULT 'Disponible todos los días',
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_experiences_seq_id` (`seq_id`),
  UNIQUE KEY `uk_experiences_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- TABLA 6: season_rates
-- Propósito: Configuración de temporadas altas y multiplicadores dinámicos de tarifa.
-- -------------------------------------------------------------------------------------
CREATE TABLE `season_rates` (
  `seq_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `multiplier` DECIMAL(6,4) NOT NULL DEFAULT 1.4118 COMMENT 'Multiplicador sobre tarifa base (ej. 120000/85000 = 1.4118)',
  `minimum_stay_nights` INT UNSIGNED NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_season_seq_id` (`seq_id`),
  INDEX `idx_season_dates` (`start_date`, `end_date`),
  INDEX `idx_season_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- TABLA 7: guests
-- Propósito: Registro maestro de huéspedes con validación de tipo y número de documento.
-- -------------------------------------------------------------------------------------
CREATE TABLE `guests` (
  `seq_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Secuencia numérica del huésped',
  `id` VARCHAR(50) NOT NULL COMMENT 'ID del huésped (ej. guest-1)',
  `document_type` ENUM('CC', 'CE', 'PASSPORT', 'NIT', 'OTHER') NOT NULL DEFAULT 'CC',
  `document_number` VARCHAR(20) NOT NULL COMMENT '10 dígitos para CC/CE o 6-15 alfanumérico para Pasaporte',
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NOT NULL COMMENT 'Celular / WhatsApp de 10 dígitos',
  `nationality` VARCHAR(80) NOT NULL DEFAULT 'Colombiana',
  `emergency_contact` VARCHAR(180) NULL DEFAULT NULL,
  `notes` TEXT NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_guests_seq_id` (`seq_id`),
  UNIQUE KEY `uk_guests_document` (`document_type`, `document_number`),
  INDEX `idx_guests_doc_number` (`document_number`),
  INDEX `idx_guests_email` (`email`),
  INDEX `idx_guests_phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- TABLA 8: reservations
-- Propósito: Motor central de reservas, estados, tarifas aplicadas y aceptación de políticas.
-- -------------------------------------------------------------------------------------
CREATE TABLE `reservations` (
  `seq_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Secuencia numérica de reserva',
  `id` VARCHAR(50) NOT NULL COMMENT 'ID interno (ej. res-101, res-ene-1)',
  `reservation_code` VARCHAR(30) NOT NULL COMMENT 'Código público único (ej. COL-2026-9012)',
  `room_id` VARCHAR(50) NOT NULL,
  `guest_id` VARCHAR(50) NOT NULL,
  `check_in_date` DATE NOT NULL,
  `check_out_date` DATE NOT NULL,
  `adults` INT UNSIGNED NOT NULL DEFAULT 2,
  `children` INT UNSIGNED NOT NULL DEFAULT 0,
  `nightly_rate` DECIMAL(12,2) NOT NULL DEFAULT 85000.00,
  `seasonal_multiplier` DECIMAL(6,4) NOT NULL DEFAULT 1.0000,
  `subtotal` DECIMAL(12,2) NOT NULL,
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED') NOT NULL DEFAULT 'PENDING_PAYMENT',
  `accepted_cancellation_terms` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = El cliente aceptó la política del 50% de anticipo',
  `payment_hold_deadline` DATETIME NULL DEFAULT NULL,
  `special_requests` TEXT NULL DEFAULT NULL,
  `cancellation_reason` TEXT NULL DEFAULT NULL,
  `checked_in_at` DATETIME NULL DEFAULT NULL,
  `checked_out_at` DATETIME NULL DEFAULT NULL,
  `confirmation_sent` TINYINT(1) NOT NULL DEFAULT 0,
  `confirmation_sent_at` DATETIME NULL DEFAULT NULL,
  `reminder_sent` TINYINT(1) NOT NULL DEFAULT 0,
  `reminder_sent_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reservations_seq_id` (`seq_id`),
  UNIQUE KEY `uk_reservations_code` (`reservation_code`),
  INDEX `idx_res_dates` (`check_in_date`, `check_out_date`),
  INDEX `idx_res_status` (`status`),
  INDEX `idx_res_room` (`room_id`),
  INDEX `idx_res_guest` (`guest_id`),
  INDEX `idx_res_hold_deadline` (`payment_hold_deadline`),
  CONSTRAINT `fk_reservations_room`
    FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_reservations_guest`
    FOREIGN KEY (`guest_id`) REFERENCES `guests` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_reservation_dates`
    CHECK (`check_out_date` > `check_in_date`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- TABLA 9: transactions
-- Propósito: Registro y auditoría de pagos/anticipos (Bancolombia, Nequi, Daviplata, etc.).
-- -------------------------------------------------------------------------------------
CREATE TABLE `transactions` (
  `seq_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Secuencia numérica de transacción',
  `id` VARCHAR(50) NOT NULL COMMENT 'ID de transacción (ej. tx-1)',
  `reservation_id` VARCHAR(50) NOT NULL,
  `payment_channel` ENUM('NEQUI', 'DAVIPLATA', 'BANCOLOMBIA_TRANSFER', 'CREDIT_CARD', 'CASH_ON_SITE') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `reference_code` VARCHAR(100) NOT NULL,
  `proof_slip_url` TEXT NULL DEFAULT NULL,
  `verification_status` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `rejection_reason` TEXT NULL DEFAULT NULL,
  `verified_at` DATETIME NULL DEFAULT NULL,
  `verified_by` VARCHAR(120) NULL DEFAULT NULL,
  `notes` TEXT NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_transactions_seq_id` (`seq_id`),
  INDEX `idx_tx_reservation` (`reservation_id`),
  INDEX `idx_tx_status` (`verification_status`),
  INDEX `idx_tx_channel` (`payment_channel`),
  INDEX `idx_tx_reference` (`reference_code`),
  CONSTRAINT `fk_transactions_reservation`
    FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- TABLA 10: chat_widget_faqs
-- Propósito: Nodos del árbol de conversación del asistente virtual de la finca.
-- -------------------------------------------------------------------------------------
CREATE TABLE `chat_widget_faqs` (
  `seq_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id` VARCHAR(50) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `keywords` JSON NULL DEFAULT NULL,
  `user_question` VARCHAR(255) NOT NULL,
  `bot_answer` TEXT NOT NULL,
  `quick_replies` JSON NOT NULL,
  `next_node_id` VARCHAR(50) NULL DEFAULT NULL,
  `requires_whatsapp_escalation` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_faq_seq_id` (`seq_id`),
  INDEX `idx_faq_category` (`category`),
  INDEX `idx_faq_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================================
-- SECCIÓN II: TRIGGERS AUTOMÁTICOS DE SECUENCIA (PARA NUEVOS REGISTROS)
-- =====================================================================================

DELIMITER $$

-- Trigger para autogenerar ID y Código de Reserva (COL-2026-XXXX) si no se proveen
CREATE TRIGGER `trg_before_insert_reservation`
BEFORE INSERT ON `reservations`
FOR EACH ROW
BEGIN
  DECLARE next_val BIGINT UNSIGNED;
  IF NEW.id IS NULL OR NEW.id = '' OR NEW.reservation_code IS NULL OR NEW.reservation_code = '' THEN
    UPDATE `system_sequences`
       SET `current_value` = `current_value` + `step`
     WHERE `sequence_name` = 'reservation_code_seq';

    SELECT `current_value` INTO next_val
      FROM `system_sequences`
     WHERE `sequence_name` = 'reservation_code_seq';

    IF NEW.id IS NULL OR NEW.id = '' THEN
      SET NEW.id = CONCAT('res-', next_val);
    END IF;

    IF NEW.reservation_code IS NULL OR NEW.reservation_code = '' THEN
      SET NEW.reservation_code = CONCAT('COL-', YEAR(NEW.check_in_date), '-', LPAD(next_val, 4, '0'));
    END IF;
  END IF;
END$$

-- Trigger para autogenerar ID de Huésped (guest-X) si no se provee
CREATE TRIGGER `trg_before_insert_guest`
BEFORE INSERT ON `guests`
FOR EACH ROW
BEGIN
  DECLARE next_val BIGINT UNSIGNED;
  IF NEW.id IS NULL OR NEW.id = '' THEN
    UPDATE `system_sequences`
       SET `current_value` = `current_value` + `step`
     WHERE `sequence_name` = 'guest_seq';

    SELECT `current_value` INTO next_val
      FROM `system_sequences`
     WHERE `sequence_name` = 'guest_seq';

    SET NEW.id = CONCAT('guest-', next_val);
  END IF;
END$$

-- Trigger para autogenerar ID de Transacción (tx-X) si no se provee
CREATE TRIGGER `trg_before_insert_transaction`
BEFORE INSERT ON `transactions`
FOR EACH ROW
BEGIN
  DECLARE next_val BIGINT UNSIGNED;
  IF NEW.id IS NULL OR NEW.id = '' THEN
    UPDATE `system_sequences`
       SET `current_value` = `current_value` + `step`
     WHERE `sequence_name` = 'transaction_seq';

    SELECT `current_value` INTO next_val
      FROM `system_sequences`
     WHERE `sequence_name` = 'transaction_seq';

    SET NEW.id = CONCAT('tx-', next_val);
  END IF;
END$$

DELIMITER ;


-- =====================================================================================
-- SECCIÓN III: DML (DATA MANIPULATION LANGUAGE) - POBLADO DE DATOS REALES DEL PROYECTO
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Inicialización de Secuencias del Sistema
-- -------------------------------------------------------------------------------------
INSERT INTO `system_sequences` (`sequence_name`, `prefix`, `current_value`, `step`) VALUES
('room_seq', 'room-', 7, 1),
('guest_seq', 'guest-', 3, 1),
('reservation_code_seq', 'COL-2026-', 9500, 1),
('transaction_seq', 'tx-', 2, 1),
('experience_seq', 'exp-', 4, 1);

-- -------------------------------------------------------------------------------------
-- 2. Usuarios Administradores del Sistema
-- -------------------------------------------------------------------------------------
INSERT INTO `admin_users` (`id`, `username`, `password_hash`, `full_name`, `email`, `role`, `is_active`) VALUES
('admin-1', 'admin', 'admin123', 'Don Joaquín Emilio Restrepo (Administrador)', 'restreporojassantiago940@gmail.com', 'SUPERADMIN', 1);

-- -------------------------------------------------------------------------------------
-- 3. Configuración General de Finca La Colmena de Don Juaco
-- -------------------------------------------------------------------------------------
INSERT INTO `settings` (
  `id`, `property_name`, `tagline`, `phone`, `email`, `whatsapp_number`,
  `location_address`, `check_in_time`, `check_out_time`, `default_min_stay_nights`,
  `payment_hold_minutes`, `cancellation_penalty_percent`, `bancolombia_account_type`,
  `bancolombia_account_number`, `bancolombia_holder_name`, `bancolombia_nit`,
  `nequi_number`, `daviplata_number`
) VALUES (
  'colmena_settings',
  'Finca La Colmena de Don Juaco',
  'Alojamiento Campestre & Agroturismo Tradicional',
  '+57 301 567 7776',
  'restreporojassantiago940@gmail.com',
  '573015677776',
  'Finca La Colmena, Montenegro, Quindío, Colombia (Ubicación Google Maps: https://maps.app.goo.gl/md6fqEjjRVBKxoP68)',
  '15:00',
  '11:00',
  1,
  25,
  50.00,
  'Cuenta de Ahorros',
  '482-901842-19',
  'Joaquín Emilio Restrepo / Finca La Colmena',
  '901.482.190-4',
  '3015677776',
  '3015677776'
);

-- -------------------------------------------------------------------------------------
-- 4. Inventario de las 7 Habitaciones Campestres Reales
-- -------------------------------------------------------------------------------------
INSERT INTO `rooms` (
  `id`, `room_number`, `name`, `slug`, `description`, `capacity`, `base_price`,
  `out_of_service`, `out_of_service_reason`, `bed_type`, `view_type`, `square_meters`,
  `amenities`, `images`, `sort_order`, `created_at`, `updated_at`
) VALUES
(
  'room-1',
  'Doble',
  'Habitación Doble',
  'habitacion-doble',
  'Acogedora y luminosa habitación para 2 personas con 1 cama doble matrimonial, ventilador, TV pantalla plana, baño privado con agua caliente, toallas suaves y wifi. Desayuno campesino incluido.',
  2,
  85000.00,
  0,
  NULL,
  '1 Cama Doble Matrimonial',
  'Vista al Cafetal & Jardín',
  24,
  JSON_ARRAY('1 Cama Doble Matrimonial', 'TV Pantalla Plana', 'Ventilador', 'Toallas', 'Agua caliente', 'WiFi', 'Desayuno campesino incluido'),
  JSON_ARRAY('/rooms/habitacion-doble.jpg'),
  1,
  '2026-01-01 00:00:00',
  '2026-09-30 12:00:00'
),
(
  'room-2',
  'Triple 1',
  'Habitación Triple (Madera Colonial)',
  'habitacion-triple-madera',
  'Hermosa habitación triple con pisos de madera cálida, techo artesanal y ventilador de techo. Equipada con 1 cama doble y 1 cama sencilla, TV, baño privado con agua caliente y wifi. Desayuno campesino incluido.',
  3,
  85000.00,
  0,
  NULL,
  '1 Cama Doble + 1 Cama Sencilla',
  'Vista a la Montaña y Sendero',
  28,
  JSON_ARRAY('1 Cama Doble y 1 Sencilla', 'Piso y Techo de Madera', 'Ventilador de Techo', 'TV', 'Toallas', 'Agua caliente', 'WiFi', 'Desayuno campesino incluido'),
  JSON_ARRAY('/rooms/habitacion-triple-madera.jpg'),
  2,
  '2026-01-01 00:00:00',
  '2026-09-30 12:00:00'
),
(
  'room-3',
  'Triple 2',
  'Habitación Triple (Cabecero Tallado)',
  'habitacion-triple-tallada',
  'Confortable habitación triple con imponente cama de cabecero tallado artesanal y 1 cama sencilla adicional. Cuenta con ventana colonial tradicional, TV, ventilador, baño privado con agua caliente y wifi. Desayuno campesino incluido.',
  3,
  85000.00,
  0,
  NULL,
  '1 Cama Doble + 1 Cama Sencilla',
  'Vista Panorámica a la Finca',
  29,
  JSON_ARRAY('1 Cama Doble y 1 Sencilla', 'Cabecero Tallado Artesanal', 'TV', 'Ventilador', 'Toallas', 'Agua caliente', 'WiFi', 'Desayuno campesino incluido'),
  JSON_ARRAY('/rooms/habitacion-triple-tallada.jpg'),
  3,
  '2026-01-01 00:00:00',
  '2026-09-30 12:00:00'
),
(
  'room-4',
  'Triple 3',
  'Habitación Triple (Colonial Cafetera)',
  'habitacion-triple-colonial',
  'Espaciosa habitación colonial con ventana de postigos tradicionales y vista al exterior. Equipada con 1 cama doble, 1 cama sencilla, cómoda con TV, ventilador, baño privado con agua caliente y wifi. Desayuno campesino incluido.',
  3,
  85000.00,
  0,
  NULL,
  '1 Cama Doble + 1 Cama Sencilla',
  'Vista al Huerto y Cafetal',
  28,
  JSON_ARRAY('1 Cama Doble y 1 Sencilla', 'Cómoda con TV', 'Ventilador', 'Toallas', 'Agua caliente', 'WiFi', 'Desayuno campesino incluido'),
  JSON_ARRAY('/rooms/habitacion-triple-colonial.jpg'),
  4,
  '2026-01-01 00:00:00',
  '2026-09-30 12:00:00'
),
(
  'room-5',
  'Triple 4',
  'Habitación Triple (Campestre Quindío)',
  'habitacion-triple-campestre',
  'Auténtica habitación campestre quindiana con 1 cama doble y 1 cama sencilla en madera maciza. Cuenta con cajonera rústica, TV, ventilador, toallas suaves, baño privado con agua caliente y wifi. Desayuno campesino incluido.',
  3,
  85000.00,
  0,
  NULL,
  '1 Cama Doble + 1 Cama Sencilla',
  'Vista a la Reserva Natural',
  28,
  JSON_ARRAY('1 Cama Doble y 1 Sencilla', 'Cajonera Rústica', 'TV', 'Ventilador', 'Toallas', 'Agua caliente', 'WiFi', 'Desayuno campesino incluido'),
  JSON_ARRAY('/rooms/habitacion-triple-campestre.jpg'),
  5,
  '2026-01-01 00:00:00',
  '2026-09-30 12:00:00'
),
(
  'room-6',
  'Cuádruple 1',
  'Habitación Cuádruple (Suite Ladrillo)',
  'habitacion-cuadruple-ladrillo',
  'Espectacular y espaciosa habitación cuádruple con paredes rústicas de ladrillo a la vista, techo en madera maciza y obra de arte ecuestre. Dispone de 2 camas dobles y 1 cama sencilla, TV, ventilador, baño privado amplio con agua caliente y wifi. Desayuno campesino incluido.',
  4,
  85000.00,
  0,
  NULL,
  '2 Camas Dobles + 1 Cama Sencilla',
  'Vista a los Senderos Ecológicos',
  38,
  JSON_ARRAY('2 Camas Dobles y 1 Sencilla', 'Paredes de Ladrillo a la Vista', 'Techo de Madera', 'TV', 'Ventilador', 'Toallas', 'Agua caliente', 'WiFi', 'Desayuno campesino incluido'),
  JSON_ARRAY('/rooms/habitacion-cuadruple-ladrillo.jpg'),
  6,
  '2026-01-01 00:00:00',
  '2026-09-30 12:00:00'
),
(
  'room-7',
  'Cuádruple 2',
  'Habitación Cuádruple Familiar',
  'habitacion-cuadruple-familiar',
  'Gran habitación familiar de alta capacidad para 4 personas con 1 cama doble y 2 camas sencillas. Equipada con TV, ventilador, toallas, baño privado con agua caliente y wifi. Desayuno campesino incluido.',
  4,
  85000.00,
  0,
  NULL,
  '1 Cama Doble + 2 Camas Sencillas',
  'Vista al Atardecer de la Cordillera',
  35,
  JSON_ARRAY('1 Cama Doble y 2 Sencillas', 'TV', 'Ventilador', 'Toallas', 'Agua caliente', 'WiFi', 'Desayuno campesino incluido'),
  JSON_ARRAY('/rooms/habitacion-cuadruple-ladrillo.jpg', '/rooms/habitacion-triple-madera.jpg'),
  7,
  '2026-01-01 00:00:00',
  '2026-09-30 12:00:00'
);

-- -------------------------------------------------------------------------------------
-- 5. Experiencias y Zonas Sociales de la Finca
-- -------------------------------------------------------------------------------------
INSERT INTO `experiences` (
  `id`, `title`, `slug`, `category`, `short_description`, `full_description`,
  `image_url`, `default_image_url`, `included_in_stay`, `schedule_info`, `sort_order`, `is_active`
) VALUES
(
  'zona-mascotas',
  'Zona Verde para Mascotas (Pet Friendly)',
  'zona-verde-mascotas',
  'Naturaleza & Mascotas',
  'Amplios prados seguros y cercados para que tus mascotas corran libres en plena naturaleza.',
  'En Finca La Colmena amamos a los animales. Disponemos de extensas zonas verdes rodeadas de árboles frutales y senderos ecológicos seguros para que tus mascotas disfruten tanto como tú.',
  '/experiences/zona-mascotas.jpg',
  '/experiences/zona-mascotas.jpg',
  1,
  'Acceso libre 24 horas',
  1,
  1
),
(
  'zona-ninos',
  'Parque Infantil & Zona de Columpios',
  'parque-infantil-columpios',
  'Familia & Recreación',
  'Espacio campestre con columpios tradicionales y juegos al aire libre para los niños.',
  'Un rincón pensado especialmente para la alegría de los más pequeños, ubicado sobre césped natural bajo la sombra de los árboles de la finca.',
  '/experiences/zona-ninos.jpg',
  '/experiences/zona-ninos.jpg',
  1,
  '7:00 AM - 8:00 PM',
  2,
  1
),
(
  'piscina',
  'Piscina Campestre con Solárium',
  'piscina-campestre',
  'Descanso & Sol',
  'Refrescante piscina al aire libre rodeada de palmas, guaduales y el clima cálido del Quindío.',
  'Disfruta del sol quindiano en nuestra piscina familiar con zona de asoleadoras, perfecta para relajarse después de recorrer los parques temáticos de la región.',
  '/experiences/piscina.jpg',
  '/experiences/piscina.jpg',
  1,
  '8:00 AM - 8:00 PM',
  3,
  1
),
(
  'pequeno-bar',
  'Kiosko & Pequeño Bar Campestre',
  'pequeno-bar-campestre',
  'Gastronomía & Tertulia',
  'Punto de encuentro tradicional para disfrutar bebidas refrescantes, café de origen y música.',
  'Construido en guadua y madera típica del Paisaje Cultural Cafetero, ideal para compartir en familia o con amigos al caer la tarde.',
  '/experiences/pequeno-bar.jpg',
  '/experiences/pequeno-bar.jpg',
  1,
  '10:00 AM - 10:00 PM',
  4,
  1
);

-- -------------------------------------------------------------------------------------
-- 6. Tarifas Estacionales (Temporada Alta Oficial: 20 Dic - 20 Ene)
-- -------------------------------------------------------------------------------------
INSERT INTO `season_rates` (
  `id`, `name`, `start_date`, `end_date`, `multiplier`, `minimum_stay_nights`, `is_active`
) VALUES
(
  'season-alta-dic-ene',
  'Temporada Alta (20 Dic - 20 Ene)',
  '2026-12-20',
  '2027-01-20',
  1.4118,
  1,
  1
);

-- -------------------------------------------------------------------------------------
-- 7. Huéspedes Registrados
-- -------------------------------------------------------------------------------------
INSERT INTO `guests` (
  `id`, `document_type`, `document_number`, `full_name`, `email`, `phone`,
  `nationality`, `emergency_contact`, `notes`, `created_at`, `updated_at`
) VALUES
(
  'guest-1',
  'CC',
  '1094928174',
  'Carolina Herrera Pardo',
  'carolina.herrera@gmail.com',
  '3104458921',
  'Colombiana',
  'Carlos Herrera (+57 312 889 1234)',
  'Huésped habitual. Desayuno campesino con café sin azúcar.',
  '2026-09-10 10:00:00',
  '2026-09-10 10:00:00'
),
(
  'guest-2',
  'PASSPORT',
  'A28491029',
  'Lucas Weber',
  'lucas.weber.berlin@outlook.de',
  '3148892104',
  'Alemana',
  'Greta Weber (+49 176 5543 2190)',
  'Interesado en ornitología y proceso del café.',
  '2026-09-12 14:30:00',
  '2026-09-12 14:30:00'
),
(
  'guest-3',
  'CC',
  '1052894102',
  'Andrés Felipe Morales',
  'af.morales@bancolombia.com.co',
  '3167723109',
  'Colombiana',
  'Silvia Morales (+57 315 220 9811)',
  'Llegada tarde estimada 19:30.',
  '2026-09-15 09:15:00',
  '2026-09-15 09:15:00'
);

-- -------------------------------------------------------------------------------------
-- 8. Reservaciones Históricas y Activas (Enero a Diciembre 2026)
-- -------------------------------------------------------------------------------------
INSERT INTO `reservations` (
  `id`, `reservation_code`, `room_id`, `guest_id`, `check_in_date`, `check_out_date`,
  `adults`, `children`, `nightly_rate`, `seasonal_multiplier`, `subtotal`, `tax_amount`,
  `total_amount`, `status`, `accepted_cancellation_terms`, `payment_hold_deadline`,
  `special_requests`, `checked_in_at`, `created_at`, `updated_at`
) VALUES
-- Enero 2026 (Temporada Alta y Regular)
('res-ene-1',  'COL-2026-1001', 'room-1', 'guest-1', '2026-01-03', '2026-01-05', 2, 0, 120000.00, 1.4118, 240000.00, 0.00, 240000.00, 'CHECKED_OUT', 1, NULL, NULL, '2026-01-03 15:00:00', '2026-01-01 10:00:00', '2026-01-05 11:00:00'),
('res-ene-2',  'COL-2026-1002', 'room-2', 'guest-2', '2026-01-04', '2026-01-07', 3, 0, 120000.00, 1.4118, 360000.00, 0.00, 360000.00, 'CHECKED_OUT', 1, NULL, NULL, '2026-01-04 15:00:00', '2026-01-02 10:00:00', '2026-01-07 11:00:00'),
('res-ene-3',  'COL-2026-1003', 'room-6', 'guest-3', '2026-01-06', '2026-01-09', 4, 0, 120000.00, 1.4118, 360000.00, 0.00, 360000.00, 'CHECKED_OUT', 1, NULL, NULL, '2026-01-06 15:00:00', '2026-01-03 10:00:00', '2026-01-09 11:00:00'),
('res-ene-4',  'COL-2026-1004', 'room-1', 'guest-1', '2026-01-08', '2026-01-10', 2, 0, 120000.00, 1.4118, 240000.00, 0.00, 240000.00, 'CHECKED_OUT', 1, NULL, NULL, '2026-01-08 15:00:00', '2026-01-05 10:00:00', '2026-01-10 11:00:00'),
('res-ene-5',  'COL-2026-1005', 'room-3', 'guest-2', '2026-01-10', '2026-01-12', 3, 0, 120000.00, 1.4118, 240000.00, 0.00, 240000.00, 'CHECKED_OUT', 1, NULL, NULL, '2026-01-10 15:00:00', '2026-01-06 10:00:00', '2026-01-12 11:00:00'),
('res-ene-6',  'COL-2026-1006', 'room-7', 'guest-3', '2026-01-12', '2026-01-15', 4, 0, 120000.00, 1.4118, 360000.00, 0.00, 360000.00, 'CHECKED_OUT', 1, NULL, NULL, '2026-01-12 15:00:00', '2026-01-08 10:00:00', '2026-01-15 11:00:00'),
('res-ene-7',  'COL-2026-1007', 'room-1', 'guest-1', '2026-01-15', '2026-01-17', 2, 0, 120000.00, 1.4118, 240000.00, 0.00, 240000.00, 'CHECKED_OUT', 1, NULL, NULL, '2026-01-15 15:00:00', '2026-01-10 10:00:00', '2026-01-17 11:00:00'),
('res-ene-8',  'COL-2026-1008', 'room-4', 'guest-2', '2026-01-18', '2026-01-20', 3, 0, 120000.00, 1.4118, 240000.00, 0.00, 240000.00, 'CHECKED_OUT', 1, NULL, NULL, '2026-01-18 15:00:00', '2026-01-14 10:00:00', '2026-01-20 11:00:00'),
('res-ene-9',  'COL-2026-1009', 'room-1', 'guest-1', '2026-01-22', '2026-01-24', 2, 0,  85000.00, 1.0000, 170000.00, 0.00, 170000.00, 'CHECKED_OUT', 1, NULL, NULL, '2026-01-22 15:00:00', '2026-01-18 10:00:00', '2026-01-24 11:00:00'),
('res-ene-10', 'COL-2026-1010', 'room-5', 'guest-2', '2026-01-24', '2026-01-26', 3, 0,  85000.00, 1.0000, 170000.00, 0.00, 170000.00, 'CHECKED_OUT', 1, NULL, NULL, '2026-01-24 15:00:00', '2026-01-20 10:00:00', '2026-01-26 11:00:00'),
('res-ene-11', 'COL-2026-1011', 'room-6', 'guest-3', '2026-01-27', '2026-01-29', 4, 0,  85000.00, 1.0000, 170000.00, 0.00, 170000.00, 'CHECKED_OUT', 1, NULL, NULL, '2026-01-27 15:00:00', '2026-01-22 10:00:00', '2026-01-29 11:00:00'),
('res-ene-12', 'COL-2026-1012', 'room-1', 'guest-1', '2026-01-29', '2026-01-31', 2, 0,  85000.00, 1.0000, 170000.00, 0.00, 170000.00, 'CHECKED_OUT', 1, NULL, NULL, '2026-01-29 15:00:00', '2026-01-25 10:00:00', '2026-01-31 11:00:00'),

-- Reservas Destacadas Septiembre - Diciembre 2026
('res-101', 'COL-2026-9012', 'room-1', 'guest-1', '2026-09-20', '2026-09-23', 2, 0, 85000.00, 1.0000, 255000.00, 0.00, 255000.00, 'CHECKED_IN', 1, '2026-09-10 11:00:00', 'Flores silvestres en la habitación por aniversario.', '2026-09-20 15:10:00', '2026-09-10 10:15:00', '2026-09-20 15:10:00'),
('res-102', 'COL-2026-9108', 'room-3', 'guest-2', '2026-09-25', '2026-09-28', 3, 0, 85000.00, 1.0000, 255000.00, 0.00, 255000.00, 'CONFIRMED',  1, '2026-09-12 16:00:00', 'Tour apícola en inglés si es posible.', NULL, '2026-09-12 14:45:00', '2026-09-12 15:10:00'),
('res-oct-1', 'COL-2026-1001B', 'room-1', 'guest-1', '2026-10-10', '2026-10-12', 2, 0, 85000.00, 1.0000, 170000.00, 0.00, 170000.00, 'CONFIRMED', 1, NULL, NULL, NULL, '2026-09-15 10:00:00', '2026-09-15 10:00:00'),
('res-oct-2', 'COL-2026-1002B', 'room-2', 'guest-2', '2026-10-15', '2026-10-17', 3, 0, 85000.00, 1.0000, 170000.00, 0.00, 170000.00, 'CONFIRMED', 1, NULL, NULL, NULL, '2026-09-15 10:00:00', '2026-09-15 10:00:00'),
('res-nov-1', 'COL-2026-1101',  'room-4', 'guest-2', '2026-11-05', '2026-11-07', 3, 0, 85000.00, 1.0000, 170000.00, 0.00, 170000.00, 'CONFIRMED', 1, NULL, NULL, NULL, '2026-09-16 10:00:00', '2026-09-16 10:00:00'),
('res-dic-1', 'COL-2026-1222',  'room-6', 'guest-3', '2026-12-22', '2026-12-25', 4, 0, 120000.00, 1.4118, 360000.00, 0.00, 360000.00, 'CONFIRMED', 1, NULL, 'Cena navideña en familia.', NULL, '2026-09-18 10:00:00', '2026-09-18 10:00:00');

-- -------------------------------------------------------------------------------------
-- 9. Transacciones y Soportes de Pago Auditados
-- -------------------------------------------------------------------------------------
INSERT INTO `transactions` (
  `id`, `reservation_id`, `payment_channel`, `amount`, `reference_code`,
  `proof_slip_url`, `verification_status`, `verified_at`, `verified_by`,
  `notes`, `created_at`, `updated_at`
) VALUES
(
  'tx-1',
  'res-101',
  'BANCOLOMBIA_TRANSFER',
  255000.00,
  'BCOL-89240192',
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
  'VERIFIED',
  '2026-09-10 10:40:00',
  'Don Joaquín (Admin)',
  'Transferencia comprobada en app Bancolombia.',
  '2026-09-10 10:25:00',
  '2026-09-10 10:40:00'
),
(
  'tx-2',
  'res-102',
  'NEQUI',
  255000.00,
  'NEQ-M9841245',
  'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=600&q=80',
  'VERIFIED',
  '2026-09-12 15:10:00',
  'Don Joaquín (Admin)',
  'Comprobante Nequi verificado.',
  '2026-09-12 15:00:00',
  '2026-09-12 15:10:00'
);

-- -------------------------------------------------------------------------------------
-- 10. Preguntas Frecuentes del Asistente Virtual (ChatWidget)
-- -------------------------------------------------------------------------------------
INSERT INTO `chat_widget_faqs` (
  `id`, `category`, `keywords`, `user_question`, `bot_answer`, `quick_replies`,
  `next_node_id`, `requires_whatsapp_escalation`, `sort_order`, `is_active`
) VALUES
(
  'root',
  'inicio',
  JSON_ARRAY('hola', 'inicio', 'informacion', 'reservar'),
  'Bienvenido a Finca La Colmena de Don Juaco',
  '¡Hola! Bienvenido a Finca La Colmena de Don Juaco. Contamos con 7 confortables habitaciones con TV, ventilador, toallas, agua caliente, wifi y delicioso desayuno campesino incluido. ¿En qué te podemos colaborar hoy?',
  JSON_ARRAY(
    JSON_OBJECT('label', 'Habitaciones y Tarifas ($85.000 / $120.000)', 'nextNodeId', 'tarifas_habitaciones'),
    JSON_OBJECT('label', '¿Dónde nos ubicamos? (Google Maps)', 'nextNodeId', 'como_llegar'),
    JSON_OBJECT('label', 'Experiencias de la Finca', 'nextNodeId', 'experiencias'),
    JSON_OBJECT('label', '¿Qué incluye el desayuno?', 'nextNodeId', 'desayuno'),
    JSON_OBJECT('label', 'Hablar con Don Juaco en WhatsApp', 'action', 'whatsapp')
  ),
  NULL,
  0,
  1,
  1
),
(
  'tarifas_habitaciones',
  'tarifas',
  JSON_ARRAY('precio', 'tarifa', 'habitaciones', 'costo', 'noche'),
  '¿Cuáles son las tarifas y cómo son las 7 habitaciones?',
  'En Finca La Colmena organizamos nuestras habitaciones según su capacidad:\n• Temporada Regular: $85.000 COP por noche (Desayuno campesino incluido).\n• Temporada Alta (20 dic al 20 ene): $120.000 COP por noche (Desayuno campesino incluido).\nTodas incluyen TV, ventilador, toallas, agua caliente y wifi.',
  JSON_ARRAY(
    JSON_OBJECT('label', 'Reservar Habitación', 'action', 'book'),
    JSON_OBJECT('label', 'Ver Ubicación en Maps', 'nextNodeId', 'como_llegar'),
    JSON_OBJECT('label', 'Menú Principal', 'nextNodeId', 'root')
  ),
  'root',
  0,
  2,
  1
),
(
  'desayuno',
  'alimentacion',
  JSON_ARRAY('desayuno', 'comida', 'incluye', 'cafe'),
  '¿Qué incluye el desayuno campesino?',
  'Tanto en temporada baja ($85.000) como en temporada alta ($120.000), el desayuno campesino tradicional está 100% incluido: huevos frescos al gusto, arepa con queso campesino, miel pura de la finca, fruta fresca y chocolate o café especial recién colado.',
  JSON_ARRAY(
    JSON_OBJECT('label', 'Ver Disponibilidad', 'action', 'book'),
    JSON_OBJECT('label', 'Menú Principal', 'nextNodeId', 'root')
  ),
  'root',
  0,
  3,
  1
),
(
  'como_llegar',
  'ubicacion',
  JSON_ARRAY('ubicacion', 'llegar', 'direccion', 'mapa', 'montenegro', 'quindio'),
  '¿Dónde están ubicados y cómo llegar?',
  'Estamos ubicados en Montenegro, corazón del Quindío, a pocos minutos de Panaca y el Parque del Café. Ubicación Google Maps: https://maps.app.goo.gl/md6fqEjjRVBKxoP68',
  JSON_ARRAY(
    JSON_OBJECT('label', 'Ver Habitaciones', 'action', 'book'),
    JSON_OBJECT('label', 'Menú Principal', 'nextNodeId', 'root')
  ),
  'root',
  0,
  4,
  1
),
(
  'experiencias',
  'experiencias',
  JSON_ARRAY('piscina', 'mascotas', 'ninos', 'columpios', 'bar'),
  '¿Qué experiencias se pueden vivir en la finca?',
  'Disfrutarás de piscina campestre, parque infantil con columpios, amplias zonas verdes pet-friendly para mascotas, kiosko bar y senderos cafeteros.',
  JSON_ARRAY(
    JSON_OBJECT('label', 'Reservar Ahora', 'action', 'book'),
    JSON_OBJECT('label', 'Menú Principal', 'nextNodeId', 'root')
  ),
  'root',
  0,
  5,
  1
);


-- =====================================================================================
-- SECCIÓN IV: VISTAS ANALÍTICAS PARA EL PANEL DE ADMINISTRACIÓN EN MYSQL WORKBENCH
-- =====================================================================================

-- Vista 1: Resumen completo de reservas con datos del huésped y habitación
CREATE OR REPLACE VIEW `v_reservations_detail` AS
SELECT
  r.seq_id,
  r.id AS reservation_id,
  r.reservation_code,
  r.status,
  r.check_in_date,
  r.check_out_date,
  DATEDIFF(r.check_out_date, r.check_in_date) AS nights,
  rm.room_number,
  rm.name AS room_name,
  rm.capacity AS room_capacity,
  g.document_type,
  g.document_number,
  g.full_name AS guest_name,
  g.email AS guest_email,
  g.phone AS guest_phone,
  r.nightly_rate,
  r.total_amount,
  r.accepted_cancellation_terms,
  r.created_at
FROM `reservations` r
INNER JOIN `rooms` rm ON r.room_id = rm.id
INNER JOIN `guests` g ON r.guest_id = g.id;

-- Vista 2: Ingresos mensuales y ocupación por tipo de habitación
CREATE OR REPLACE VIEW `v_monthly_revenue` AS
SELECT
  YEAR(r.check_in_date) AS anio,
  MONTH(r.check_in_date) AS mes,
  rm.name AS habitacion,
  COUNT(r.id) AS total_reservas,
  SUM(r.total_amount) AS ingresos_cop
FROM `reservations` r
INNER JOIN `rooms` rm ON r.room_id = rm.id
WHERE r.status IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT')
GROUP BY YEAR(r.check_in_date), MONTH(r.check_in_date), rm.name;

SET FOREIGN_KEY_CHECKS = 1;
-- =====================================================================================
-- FIN DEL SCRIPT SQL - FINCA DON JOACO
-- =====================================================================================
