# 📦 NCM Fiscal Pro — SDK & API Oficial de Consulta e Validação Fiscal

> **API REST e SDK de alta performance em Cloudflare Edge Anycast (<2ms de latência) para consulta, busca textual, decomposição de árvore genealógica e validação de 15.042 códigos NCM (Nomenclatura Comum do Mercosul - Receita Federal e Camex) com proteção ativa contra a Rejeição 778 da SEFAZ.**

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20Edge-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Base Oficial](https://img.shields.io/badge/Base-Receita%20Federal%20%7C%20Camex-blue.svg)](#)
[![Acervo](https://img.shields.io/badge/Acervo-15.042%20NCMs-10b981.svg)](#)
[![Latência](https://img.shields.io/badge/Latência-sub--2ms-cyan.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## ⚡ O que é o NCM Fiscal Pro?

O **NCM Fiscal Pro** é um microsserviço de infraestrutura fiscal soberana projetado para:
- **ERPs & Sistemas de Gestão de Estoque**: Validação de NCM no cadastro de produtos para impedir emissões rejeitadas na SEFAZ.
- **Frentes de Caixa (PDV) & Emissores de NFC-e / NF-e**: Bloqueio de códigos não faturáveis (NCMs com menos de 8 dígitos que causam a **Rejeição 778 da SEFAZ**).
- **E-commerces & Marketplaces**: Autocomplete e busca inteligente de classificação fiscal de produtos por nome ou prefixo.
- **Auditoria de Catálogo**: Endpoint de validação em lote (`/api/ncm/validar-lote`) para auditar até 200 produtos por requisição.
- **Agentes de IA & Automações**: Resposta JSON ultracompacta para economia de tokens em agentes de compras, cotações e faturamento.

---

## 🚀 Como Integrar em seu Projeto

### 1. Instalação via NPM

```bash
npm install ncmfiscal-pro
```

*(Ou utilize o arquivo `ncmfiscal-pro.js` diretamente no seu backend Node.js, Deno, Bun ou frontend).*

### 2. Uso com o SDK Local (0ms de Rede, em RAM)

```javascript
import { NcmFiscalPro } from 'ncmfiscal-pro';

// 1. Consulta Completa de NCM (Smartphones)
const res = NcmFiscalPro.consultar('8517.13.00');

console.log(res.valido); // true
console.log(res.descricao); // 'Telefones inteligentes (smartphones)'
console.log(res.faturavel); // true (8 dígitos apto para emissão de NF-e)
console.log(res.hierarquia.capitulo.descricao); // Capítulo 85
console.log(res.dicaVarejo.exigeImei); // true (alerta de exigência de IMEI)

// 2. Busca Textual Rápida
const busca = NcmFiscalPro.buscar('cerveja', { limite: 5, apenasFaturaveis: true });
console.log(busca.totalResultados); // 6
console.log(busca.resultados[0].codigo); // 2202.91.00

// 3. Validação Rápida
const validacao = NcmFiscalPro.validar('85171300');
console.log(validacao.valido); // true
```

---

## 🌐 Endpoints Oficiais da Edge API (Cloudflare Anycast)

**Cluster Oficial:** `https://ncmfiscal-pro-api.diffstore264.workers.dev`

| Método | Endpoint | Finalidade |
| :---: | :--- | :--- |
| **`GET`** | `/api/ncm/:codigo` | Detalhes completos, árvore genealógica e aptidão para NF-e/NFC-e. |
| **`GET`** | `/api/ncm/busca?q=...` | Busca textual e por prefixo numérico com ranqueamento de relevância. |
| **`GET`** | `/api/ncm/capitulos` | Listagem dos 96 capítulos do Mercosul (01 a 99) com contagem de subitens. |
| **`GET`** | `/api/ncm/validar?ncm=...` | Validação rápida de NCM para formulários de cadastro de produto. |
| **`POST`** | `/api/ncm/validar-lote` | Auditoria de catálogo em massa (envia array de até 200 NCMs). |
| **`GET`** | `/health` | Telemetria e status operacional do cluster Cloudflare Edge. |

---

## 💻 Exemplos de Chamadas HTTP

### 1. Consulta Direta por Código NCM
```bash
# Com pontuação
curl -X GET "https://ncmfiscal-pro-api.diffstore264.workers.dev/api/ncm/8517.13.00"

# Dígitos limpos (sem pontuação)
curl -X GET "https://ncmfiscal-pro-api.diffstore264.workers.dev/api/ncm/84713012"
```

#### Exemplo de Resposta (200 OK):
```json
{
  "ok": true,
  "valido": true,
  "codigo": "8517.13.00",
  "codigoLimpo": "85171300",
  "totalDigitos": 8,
  "nivel": "subitem",
  "faturavel": true,
  "descricao": "Telefones inteligentes (smartphones)",
  "descricaoPai": "Aparelhos telefônicos, incluindo os telefones inteligentes (smartphones)...",
  "hierarquia": {
    "capitulo": {
      "codigo": "85",
      "codigoLimpo": "85",
      "descricao": "Máquinas, aparelhos e materiais elétricos..."
    },
    "posicao": {
      "codigo": "85.17",
      "codigoLimpo": "8517",
      "descricao": "Aparelhos telefônicos..."
    },
    "subposicao": {
      "codigo": "8517.1",
      "codigoLimpo": "85171",
      "descricao": "Aparelhos telefônicos..."
    },
    "subitem": {
      "codigo": "8517.13.00",
      "codigoLimpo": "85171300",
      "descricao": "Telefones inteligentes (smartphones)"
    }
  },
  "orientacaoFiscal": {
    "permiteEmissaoNFe": true,
    "aviso": "Código de 8 dígitos apto para emissão de NF-e, NFC-e e Cupom Fiscal.",
    "cfopSugerido": "5102",
    "csosnSugerido": "102"
  },
  "dicaVarejo": {
    "nomeComercial": "Smartphones & Celulares Touchscreen Novos",
    "exigeImei": true,
    "exigeSerial": false,
    "orientacaoPratica": "Obrigatoriedade de informar o IMEI (15 dígitos) na nota fiscal (NFC-e/NF-e) para garantia do fabricante e indenizações de seguro."
  },
  "fonte": "Receita Federal do Brasil / Camex Mercosul",
  "auditoria": {
    "hash": "aud_ncm_85171300_1794400899727_4f459cbe",
    "ipAnonimizado": "ip_4f459cbe",
    "timestamp": "2026-11-11T09:40:00.000Z"
  }
}
```

---

### 2. Busca Textual e por Prefixo
```bash
# Busca de produtos
curl -X GET "https://ncmfiscal-pro-api.diffstore264.workers.dev/api/ncm/busca?q=smartphone&limit=5&faturavel=true"

# Busca por prefixo numérico (Posição 8517)
curl -X GET "https://ncmfiscal-pro-api.diffstore264.workers.dev/api/ncm/busca?q=8517&limit=10"
```

---

### 3. Validação em Lote (Auditoria de Catálogo de ERP)
```bash
curl -X POST "https://ncmfiscal-pro-api.diffstore264.workers.dev/api/ncm/validar-lote" \
  -H "Content-Type: application/json" \
  -d '{"ncms": ["8517.13.00", "8471.30.12", "9999.99.99", "8517"]}'
```

#### Resposta da Validação em Lote:
```json
{
  "ok": true,
  "totalRecebido": 4,
  "totalProcessado": 4,
  "totalValidos": 3,
  "totalInvalidos": 1,
  "totalFaturaveisNFe": 2,
  "itens": [
    {
      "ncmInformado": "8517.13.00",
      "valido": true,
      "codigo": "8517.13.00",
      "faturavel": true,
      "nivel": "subitem",
      "descricao": "Telefones inteligentes (smartphones)"
    },
    {
      "ncmInformado": "9999.99.99",
      "valido": false,
      "motivo": "NCM não consta na tabela oficial Camex"
    },
    {
      "ncmInformado": "8517",
      "valido": true,
      "codigo": "85.17",
      "faturavel": false,
      "nivel": "posicao",
      "descricao": "Aparelhos telefônicos..."
    }
  ]
}
```

---

## 🛡️ Proteção Ativa Contra a Rejeição 778 da SEFAZ

A **Rejeição 778** da SEFAZ ocorre quando uma empresa tenta emitir uma NF-e ou NFC-e informando um NCM que **não existe como subitem de 8 dígitos** (por exemplo, informando apenas o capítulo `85` ou a posição `8517`).

O **NcmFiscalPro** identifica automaticamente se o NCM consultado é:
- `faturavel: true`: possui 8 dígitos e é uma folha válida da árvore tributária.
- `faturavel: false`: é um agrupador intermediário (capítulo, posição ou subposição) e **não pode** ser utilizado no XML da nota.

---

## 🔒 Auditoria Criptográfica & Conformidade com a LGPD

Toda consulta à API gera automaticamente um cabeçalho HTTP `X-Audit-Hash` e um objeto de auditoria com hash SHA-256 e IP anonimizado, garantindo rastreabilidade jurídica sem expor dados pessoais de clientes.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais detalhes.

Desenvolvido por **[clepta2](https://github.com/clepta2)** &bull; **OZPro Enterprise Ecosystem**.
