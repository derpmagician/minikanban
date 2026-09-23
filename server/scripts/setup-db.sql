-- Usuario de la aplicación
CREATE ROLE kanban
WITH LOGIN
PASSWORD 'kanban';

-- Base de datos de la aplicación
CREATE DATABASE kanban
WITH OWNER = kanban;
