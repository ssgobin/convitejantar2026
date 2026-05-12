# Jantar dos Empresários ACIA 2026 - Sistema de Gerenciamento

Sistema completo para gerenciamento e confirmação de presença do evento Jantar dos Empresários ACIA 2026.

## Tecnologias

- React 18
- Vite
- Firebase (Firestore)
- CSS3 com design premium corporativo

## Como Executar

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

O servidor akan rodar em `http://localhost:5173`

### Produção

```bash
npm run build
```

Os arquivos estaráo na pasta `dist/`

## Funcionalidades

### 1. Cadastro de Convidados
- Formulário com validações completas
- CPF/CNPJ com validação automática
- Campo empresa aparece automaticamente para CNPJ
- Telefone formatado automaticamente

### 2. Geração de Convite
- QR Code único para cada convidado
- Download em PNG ou PDF
- Compartilhamento via WhatsApp

### 3. Check-in
- Leitor de QR Code via câmera
- Entrada manual por ID do convite
- Validação de uso único do QR Code

### 4. Dashboard Admin
- Estatísticas em tempo real
- Filtros por nome, documento, mesa e status
- Exportação para Excel, CSV e PDF
- Edição e exclusão de convidados
- Regeneração de QR Code

## Estrutura do Projeto

```
src/
├── components/
│   ├── Cadastro.jsx        # Formulário de cadastro
│   ├── GeradorConvite.jsx # Visualização e download do convite
│   ├── ScannerCheckin.jsx # Leitor de QR Code
│   ├── DashboardAdmin.jsx # Painel administrativo
│   ├── Navbar.jsx         # Navegação
│   └── Toast.jsx          # Notificações
├── services/
│   └── firebase.js        # Configuração e serviços do Firebase
├── styles/
│   └── index.css          # Estilos globais premium
├── App.jsx                # Componente principal com rotas
└── main.jsx               # Entry point
```

## Configuração Firebase

O projeto já está configurado com as credenciais fornecidas. Para alterar, edite `src/services/firebase.js`.

## Design

- Paleta: Preto, Branco, Dourado (#c9a227)
- Tipografia: Playfair Display + Inter
- Responsivo para desktop, tablet e mobile