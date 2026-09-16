# Diário de Vendas Serallê Calçados

Sistema completo de controle de vendas diárias, metas mensais, cálculo de cotas, comissões e sincronização em nuvem para vendedoras e gerentes da Serallê Calçados.

## Principais Funcionalidades

- **Lançamento Rápido de Vendas:** Registro de vendas por categoria de calçados, pares, valores e margem ponderada.
- **Painel de Metas & Cotas:** Visualização em tempo real de Cota A, B, C, Cota Alta e estimativa de prêmios e comissões.
- **Sincronização Segura em Nuvem:**
  - Validação criptográfica de tokens Firebase no backend (`verifyIdToken`).
  - Firestore como fonte oficial de verdade com tolerância a falhas e reconciliação offline (LWW).
  - Pareamento de dispositivos móveis com chave de sincronização protegida.
- **Exportação & Relatórios:** Exportação em formato Planilha (CSV compatível com Excel), impressão formatada em PDF e compartilhamento para WhatsApp.
- **Aplicativo Mobile & PWA:** Suporte PWA com Service Worker offline e projeto nativo Android (Capacitor/Expo).

## Arquitetura & Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite.
- **Backend:** Node.js, Express, Firebase Admin SDK (`verifyIdToken`, Firestore).
- **Banco de Dados:** Google Cloud Firestore (segurança granular por usuário e regras de coleção).
- **Mobile:** Capacitor Android + Expo artifacts.
