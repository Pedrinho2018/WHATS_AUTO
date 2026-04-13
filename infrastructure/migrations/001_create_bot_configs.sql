-- Criação da tabela bot_configs
-- Armazena configurações de funcionamento dos bots por empresa/instância

CREATE TABLE IF NOT EXISTS bot_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  instance_id INT,
  opening_hour VARCHAR(5) NOT NULL DEFAULT '09:00' COMMENT 'Horário de abertura no formato HH:mm',
  closing_hour VARCHAR(5) NOT NULL DEFAULT '18:00' COMMENT 'Horário de fechamento no formato HH:mm',
  operating_days JSON NOT NULL DEFAULT '[0,1,2,3,4,5,6]' COMMENT 'Dias da semana operacionais (0=domingo até 6=sábado)',
  holidays JSON COMMENT 'Feriados em formato {data: nome}',
  welcome_message TEXT NOT NULL DEFAULT 'Olá! Bem-vindo.' COMMENT 'Mensagem de boas-vindas',
  standard_messages JSON COMMENT 'Mensagens padrão como greeting, goodbye, help, outside_hours, holiday',
  custom_data JSON COMMENT 'Dados customizados',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  CONSTRAINT fk_bot_configs_company_id FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_bot_configs_instance_id FOREIGN KEY (instance_id) REFERENCES instances(id),
  
  INDEX idx_company_id (company_id),
  INDEX idx_instance_id (instance_id),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configurações de funcionamento do bot';
