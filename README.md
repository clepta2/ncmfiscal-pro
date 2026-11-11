# 📦 NCM Fiscal Pro

> **Documentação Oficial da API & SDK de Classificação Fiscal, Árvore Mercosul e Tributação (Camex / Receita Federal).**  
> 🔒 **Atenção:** Este repositório destina-se exclusivamente à visualização de documentação técnica e integração do cliente SDK. O serviço de API em nuvem é operado através do nosso **Site de APIs (em breve)**. O acesso aos endpoints na borda requer obrigatoriamente uma **Chave de API (`x-api-key`)** ativa.

[![Status](https://img.shields.io/badge/Status-Cloudflare%20Edge%20API-success.svg)](#)
[![Padrão](https://img.shields.io/badge/Padrão-Receita%20Federal%20%7C%20Camex%20Mercosul-blue.svg)](#)
[![Autenticação](https://img.shields.io/badge/Autenticação-x--api--key%20Obrigatória-orange.svg)](#)
[![Acervo](https://img.shields.io/badge/Acervo-15.042%20NCMs%20Oficiais-10b981.svg)](#)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietária%20%2F%20Portal%20de%20APIs-red.svg)](LICENSE)

---

## 🔒 Acesso à API e Chaves

Para consumir esta API nos seus sistemas, ERPs, frentes de caixa (PDV) e plataformas de e-commerce, cadastre-se no nosso **Site de APIs** para obter sua chave de acesso (`x-api-key`).

Todas as requisições aos endpoints em nuvem devem incluir a chave no cabeçalho:
```http
GET /api/ncm/8517.13.00 HTTP/1.1
Host: ncmfiscal-pro-api.diffstore264.workers.dev
x-api-key: SUA_CHAVE_DO_PORTAL
```

---

## 🚀 Instalação (NPM)

```bash
npm install ncmfiscal-pro
```

*(Ou utilize o arquivo `ncmfiscal-pro.js` diretamente no Node.js, Bun, Deno ou no navegador).*

---

## ⚡ Uso com o SDK Oficial

```javascript
import { NcmFiscalPro } from 'ncmfiscal-pro';

// 1. Consulta Completa de NCM (Smartphones: 8517.13.00) — 0ms em RAM
const resSmart = NcmFiscalPro.consultar('8517.13.00');

console.log(resSmart.valido);                     // true
console.log(resSmart.descricao);                  // "Telefones inteligentes (smartphones)"
console.log(resSmart.faturavel);                  // true (8 dígitos apto para emissão de NF-e)
console.log(resSmart.secao.nome);                 // "Tecnologia, Celulares, Notebooks & Eletrônicos"
console.log(resSmart.hierarquia.capitulo.codigo); // "85"
console.log(resSmart.cestSugerido.codigo);        // "21.053.00" (Substituição Tributária)
console.log(resSmart.dicaVarejo.exigeImei);       // true (Alerta de IMEI obrigatório na NF-e)

// 2. Cálculo de Tributos da Lei da Transparência Fiscal 12.741 / IBPT
const imposto = NcmFiscalPro.estimarTributos('8517.13.00', 1500.00);

console.log(imposto.tributoTotalFormatado);       // "R$ 492,75"
console.log(imposto.percentualTotal);             // 32.85 (%)
console.log(imposto.textoCupomFiscal);            // "Trib. aprox.: R$ 492,75 (32.85%) Fonte: IBPT/Lei 12.741"

// 3. Busca Textual Inteligente e por Prefixo (Autocomplete em PDV)
const busca = NcmFiscalPro.buscar('cerveja', { limite: 5, apenasFaturaveis: true });

console.log(busca.totalResultados);               // 7
console.log(busca.resultados[0].codigo);          // "2202.91.00"
console.log(busca.resultados[0].descricao);       // "Cerveja sem álcool"

// 4. Escudo Ativo Anti-Rejeição 778 da SEFAZ
const resAgrupador = NcmFiscalPro.consultar('8517'); // Posição de 4 dígitos

console.log(resAgrupador.faturavel);              // false
console.log(resAgrupador.orientacaoFiscal.aviso); // "ATENÇÃO: A SEFAZ rejeita notas fiscais (Rejeição 778)..."
```

---

## 🌐 Endpoint Anycast Edge (Requer x-api-key)

* **Endpoint Cloudflare:** `GET https://ncmfiscal-pro-api.diffstore264.workers.dev/api/ncm/:codigo`
* **Cluster:** Cloudflare Anycast (`diffstore264.workers.dev`)
* **Autenticação:** Header `x-api-key` ou `Authorization: Bearer SUA_CHAVE`
* **Latência:** `<2ms`

### Exemplos via cURL:
```bash
# Consulta direta por código NCM
curl -X GET "https://ncmfiscal-pro-api.diffstore264.workers.dev/api/ncm/8517.13.00" \
  -H "x-api-key: SUA_CHAVE_DO_PORTAL"
```
```bash
# Busca de produtos por texto livre
curl -X GET "https://ncmfiscal-pro-api.diffstore264.workers.dev/api/ncm/busca?q=smartphone&limit=5" \
  -H "x-api-key: SUA_CHAVE_DO_PORTAL"
```
```bash
# Estimativa de tributos para Cupom Fiscal (Lei 12.741)
curl -X GET "https://ncmfiscal-pro-api.diffstore264.workers.dev/api/ncm/tributos?ncm=8517.13.00&valor=1000" \
  -H "x-api-key: SUA_CHAVE_DO_PORTAL"
```

### Exemplo de Resposta JSON Completa:
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
  "secao": {
    "numero": "XVI",
    "nome": "Tecnologia, Celulares, Notebooks & Eletrônicos",
    "icone": "📱",
    "aliquotasMedias": {
      "nac": 14.85,
      "imp": 22.4,
      "est": 18,
      "mun": 0
    }
  },
  "hierarquia": {
    "capitulo": {
      "codigo": "85",
      "codigoLimpo": "85",
      "descricao": "Máquinas, aparelhos e materiais elétricos, e suas partes..."
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
  "tributacaoAproximada": {
    "federalNacionalPercentual": 14.85,
    "federalImportadoPercentual": 22.4,
    "estadualPercentual": 18,
    "municipalPercentual": 0,
    "fonte": "IBPT / Lei da Transparência Fiscal 12.741/2012"
  },
  "cestSugerido": {
    "codigo": "21.053.00",
    "segmento": "Produtos eletrônicos, eletroeletrônicos e eletrodomésticos",
    "descricao": "Telefones inteligentes (smartphones)"
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
    "hash": "aud_ncm_85171300_1794402594101_4c0ed342",
    "ipAnonimizado": "ip_4c0ed342",
    "timestamp": "2026-11-11T13:00:00.000Z"
  }
}
```

---

## 📚 Tabela de Endpoints da API

| Método | Endpoint | Finalidade |
| :---: | :--- | :--- |
| **`GET`** | `/api/ncm/:codigo` | Detalhes completos, Seção Camex, alíquotas IBPT, CEST sugerido e aptidão NF-e. |
| **`GET`** | `/api/ncm/busca?q=...` | Busca textual e por prefixo numérico com ranqueamento inteligente. |
| **`GET`** | `/api/ncm/tributos?ncm=...&valor=100` | Cálculo aproximado de tributos para cupom fiscal / NFC-e (Lei 12.741). |
| **`GET`** | `/api/ncm/secoes` | Lista as 21 Seções Oficiais da Tabela Camex (I a XXI). |
| **`GET`** | `/api/ncm/capitulos` | Listagem dos 96 capítulos do Mercosul (01 a 99) com contagem de subitens. |
| **`GET`** | `/api/ncm/validar?ncm=...` | Validação rápida de NCM para formulários de cadastro de produto. |
| **`POST`** | `/api/ncm/validar-lote` | Auditoria de catálogo em massa (envia array de até 200 NCMs). |
| **`GET`** | `/health` | Telemetria e status operacional do cluster Cloudflare Edge. |

---

## 🛡️ Proteção Ativa Contra a Rejeição 778 da SEFAZ

A **Rejeição 778** da SEFAZ ocorre quando o emissor tenta autorizar um XML de NF-e ou NFC-e informando um código NCM que **não é folha de 8 dígitos** (por exemplo, informando apenas a posição `8517` ou o capítulo `85`).

O **NcmFiscalPro** analisa matematicamente e aduaneiramente o código e indica:
- `faturavel: true`: NCM de 8 dígitos homologado pela Receita Federal, apto para XML fiscal.
- `faturavel: false`: Código agrupador intermediário (capítulo, posição ou subposição). Rejeição imediata garantida na SEFAZ.

---

## 📄 Licença

Distribuído sob licença MIT. Veja `LICENSE` para mais detalhes.

Copyright (c) 2026 clepta2
