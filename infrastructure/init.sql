-- ═══════════════════════════════════════════════════════════════
-- Norte MT Sistemas - WhatsApp Chatbot
-- Script de Inicialização do Banco de Dados
-- ═══════════════════════════════════════════════════════════════

-- Criar banco se não existir (já criado pelo docker)
-- CREATE DATABASE IF NOT EXISTS whatsauto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE whatsauto;

-- ═══════════════════════════════════════════════════════════════
-- TABELA: Empresas (Tenants)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    cnpj VARCHAR(18),
    status ENUM('active', 'inactive', 'suspended', 'trial') DEFAULT 'trial',
    plan ENUM('basic', 'professional', 'enterprise') DEFAULT 'basic',
    trial_ends_at DATETIME,
    settings JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════
-- TABELA: Usuários
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'agent', 'viewer') DEFAULT 'agent',
    avatar VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at DATETIME,
    settings JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_email_company (email, company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════
-- TABELA: Instâncias WhatsApp
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS instances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    evolution_instance VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    status ENUM('connected', 'disconnected', 'connecting', 'error') DEFAULT 'disconnected',
    qr_code TEXT,
    webhook_url VARCHAR(500),
    settings JSON,
    last_connected_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════
-- TABELA: Tickets/Conversas
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    instance_id INT NOT NULL,
    user_id INT,
    contact_phone VARCHAR(20) NOT NULL,
    contact_name VARCHAR(255),
    status ENUM('open', 'pending', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    channel ENUM('whatsapp', 'telegram', 'messenger') DEFAULT 'whatsapp',
    tags JSON,
    metadata JSON,
    last_message_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════
-- TABELA: Mensagens
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    ticket_id INT NOT NULL,
    instance_id INT NOT NULL,
    message_id VARCHAR(100),
    direction ENUM('inbound', 'outbound') NOT NULL,
    type ENUM('text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact') DEFAULT 'text',
    content TEXT,
    media_url VARCHAR(500),
    metadata JSON,
    status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent',
    sent_at DATETIME,
    delivered_at DATETIME,
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE,
    INDEX idx_ticket_created (ticket_id, created_at),
    INDEX idx_company_created (company_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════
-- TABELA: Fluxos de Automação (n8n)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS flows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type ENUM('keyword', 'greeting', 'menu', 'webhook', 'schedule') DEFAULT 'keyword',
    trigger_config JSON,
    n8n_workflow_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    settings JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════
-- TABELA: Logs de Auditoria
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_company_created (company_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════
-- ÍNDICES ADICIONAIS
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_company_status ON tickets(company_id, status);
CREATE INDEX idx_messages_ticket ON messages(ticket_id);
CREATE INDEX idx_instances_company ON instances(company_id);
CREATE INDEX idx_users_company ON users(company_id);

-- ═══════════════════════════════════════════════════════════════
-- DADOS INICIAIS
-- ═══════════════════════════════════════════════════════════════

-- Inserir empresa padrão (Norte MT Sistemas)
INSERT INTO companies (name, subdomain, email, phone, status, plan, settings) VALUES
('Norte MT Sistemas', 'norte', 'contato@nortemtsistemas.com.br', '66999999999', 'active', 'enterprise', '{"features": ["whatsapp", "n8n", "ai"], "max_instances": 10, "max_users": 20}');

-- Inserir usuário admin padrão (senha: admin123 - trocar em produção!)
INSERT INTO users (company_id, name, email, password, role, is_active) VALUES
(1, 'Administrador', 'admin@nortemtsistemas.com.br', '$2a$10$YourHashedPasswordHere', 'admin', TRUE);

-- ═══════════════════════════════════════════════════════════════
-- FIM DO SCRIPT
-- ═══════════════════════════════════════════════════════════════