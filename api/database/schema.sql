-- Crear tabla para almacenar información de las pistas
CREATE TABLE IF NOT EXISTS tracks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_id VARCHAR(512) NOT NULL UNIQUE COMMENT 'S3/B2 Key (URL encoded)',
    file_name VARCHAR(512) NOT NULL COMMENT 'Nombre completo del archivo',
    name VARCHAR(512) NOT NULL COMMENT 'Nombre sin extensión',
    size BIGINT UNSIGNED DEFAULT 0 COMMENT 'Tamaño en bytes',
    duration INT UNSIGNED DEFAULT 0 COMMENT 'Duración estimada en segundos',
    type VARCHAR(100) DEFAULT 'audio/mpeg' COMMENT 'Tipo MIME',
    upload_timestamp BIGINT UNSIGNED COMMENT 'Timestamp de subida',
    plays INT UNSIGNED DEFAULT 0 COMMENT 'Número de reproducciones',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para búsqueda optimizada
    INDEX idx_file_name (file_name),
    INDEX idx_name (name),
    FULLTEXT INDEX ft_file_name (file_name),
    FULLTEXT INDEX ft_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para control de sincronización
CREATE TABLE IF NOT EXISTS sync_status (
    id INT PRIMARY KEY DEFAULT 1,
    last_sync TIMESTAMP NULL COMMENT 'Última sincronización completada',
    total_files INT UNSIGNED DEFAULT 0 COMMENT 'Total de archivos indexados',
    status VARCHAR(50) DEFAULT 'pending' COMMENT 'Estado: pending, running, completed, failed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar registro inicial de control
INSERT INTO sync_status (id, status) VALUES (1, 'pending')
ON DUPLICATE KEY UPDATE id=id;
