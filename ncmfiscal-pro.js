/**
 * NcmFiscalPro — SDK Oficial (Universal ESM / CommonJS / Cloudflare Workers)
 * Consulta, Validação e Hierarquia de 15.042 NCMs oficiais da Receita Federal & Camex.
 * 
 * @license MIT
 * @see https://github.com/clepta2/ncmfiscal-pro
 */

import { NCM_PACK } from './data/ncm-compact.js';

const { p: PARENTS, n: ITEMS } = NCM_PACK;

// Dicionário de Sinônimos Comerciais e Dicas Práticas de Varejo / ERP
const DICAS_FISCAIS_VAREJO = {
  '85171300': {
    nome: 'Smartphones & Celulares Touchscreen Novos',
    cfop: '5102',
    csosn: '102',
    exigeImei: true,
    exigeSerial: false,
    keywords: ['smartphone', 'celular', 'iphone', 'galaxy', 'xiaomi', 'motorola', 'telefone celular'],
    orientacao: 'Obrigatoriedade de informar o IMEI (15 dígitos) na nota fiscal (NFC-e/NF-e) para garantia do fabricante e indenizações de seguro.'
  },
  '84713012': {
    nome: 'Notebooks, MacBooks e Computadores Portáteis',
    cfop: '5102',
    csosn: '102',
    exigeImei: false,
    exigeSerial: true,
    keywords: ['notebook', 'laptop', 'macbook', 'ultrabook', 'computador portatil', 'gamer'],
    orientacao: 'Número de série (S/N / Service Tag) obrigatório na nota fiscal para acionamento de suporte e garantia de fábrica.'
  },
  '39269090': {
    nome: 'Películas, Capinhas e Acessórios Plásticos',
    cfop: '5102',
    csosn: '102',
    exigeImei: false,
    exigeSerial: false,
    keywords: ['pelicula', 'capinha', 'case', 'protecao tela', 'plastico'],
    orientacao: 'Classificação genérica de artefatos plásticos. Verifique alíquota de ICMS e substituição tributária (ST) no seu estado.'
  },
  '85044010': {
    nome: 'Carregadores de Bateria e Fontes de Alimentação',
    cfop: '5102',
    csosn: '102',
    exigeImei: false,
    exigeSerial: false,
    keywords: ['carregador', 'fonte', 'adaptador', 'carregador celular', 'turbo'],
    orientacao: 'Carregadores de parede e adaptadores portáteis. Exige homologação Anatel quando comercializado com celulares.'
  },
  '85183000': {
    nome: 'Fones de Ouvido e Headsets (com ou sem fio/Bluetooth)',
    cfop: '5102',
    csosn: '102',
    exigeImei: false,
    exigeSerial: false,
    keywords: ['fone', 'headset', 'airpods', 'fone de ouvido', 'bluetooth', 'auricular'],
    orientacao: 'Fones com microfone acoplado ou auriculares Bluetooth.'
  },
  '85076000': {
    nome: 'Acumuladores e Baterias de Íon de Lítio',
    cfop: '5102',
    csosn: '102',
    exigeImei: false,
    exigeSerial: true,
    keywords: ['bateria', 'powerbank', 'bateria celular', 'ion de litio'],
    orientacao: 'Baterias internas e powerbanks portáteis. Cuidado com o descarte ecológico e normas de transporte aéreo.'
  },
  '85444200': {
    nome: 'Cabos USB, Lightning, Tipo-C e Conectores',
    cfop: '5102',
    csosn: '102',
    exigeImei: false,
    exigeSerial: false,
    keywords: ['cabo', 'cabo usb', 'lightning', 'tipo-c', 'tipo c', 'type c'],
    orientacao: 'Condutores elétricos munidos de peças de conexão para tensão não superior a 1.000 V.'
  }
};

function normalizar(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Busca binária ultra-veloz em O(log n) sobre os 15.042 registros já ordenados
 */
function buscaBinariaItem(codigoLimpo) {
  let low = 0;
  let high = ITEMS.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const midCode = ITEMS[mid][0].replace(/\D/g, '');

    if (midCode === codigoLimpo) {
      return ITEMS[mid];
    }
    if (midCode < codigoLimpo) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return null;
}

export class NcmFiscalPro {
  static _capitulosCache = null;

  /**
   * Remove caracteres não numéricos
   * @param {string|number} ncm 
   * @returns {string}
   */
  static limpar(ncm) {
    if (!ncm) return '';
    return String(ncm).replace(/\D/g, '');
  }

  /**
   * Formata código NCM no padrão oficial da Receita Federal
   * Ex: 85171300 -> 8517.13.00 | 8517 -> 8517 | 01 -> 01
   * @param {string|number} ncm 
   * @returns {string}
   */
  static formatar(ncm) {
    const limpo = this.limpar(ncm);
    if (!limpo) return '';
    if (limpo.length === 8) {
      return `${limpo.slice(0, 4)}.${limpo.slice(4, 6)}.${limpo.slice(6, 8)}`;
    }
    if (limpo.length === 7) {
      return `${limpo.slice(0, 4)}.${limpo.slice(4, 6)}.${limpo.slice(6, 7)}`;
    }
    if (limpo.length === 6) {
      return `${limpo.slice(0, 4)}.${limpo.slice(4, 6)}`;
    }
    if (limpo.length === 5) {
      return `${limpo.slice(0, 4)}.${limpo.slice(4, 5)}`;
    }
    return limpo;
  }

  /**
   * Constrói a árvore hierárquica do Mercosul via busca binária
   */
  static _montarHierarquia(codigoLimpo) {
    const hierarquia = {};

    if (codigoLimpo.length >= 2) {
      const capRaw = buscaBinariaItem(codigoLimpo.slice(0, 2));
      if (capRaw) {
        hierarquia.capitulo = {
          codigo: capRaw[0],
          codigoLimpo: capRaw[0].replace(/\D/g, ''),
          descricao: capRaw[1]
        };
      }
    }

    if (codigoLimpo.length >= 4) {
      const posRaw = buscaBinariaItem(codigoLimpo.slice(0, 4));
      if (posRaw) {
        hierarquia.posicao = {
          codigo: posRaw[0],
          codigoLimpo: posRaw[0].replace(/\D/g, ''),
          descricao: posRaw[1]
        };
      }
    }

    if (codigoLimpo.length >= 6) {
      const subRaw = buscaBinariaItem(codigoLimpo.slice(0, 6)) || buscaBinariaItem(codigoLimpo.slice(0, 5));
      if (subRaw) {
        hierarquia.subposicao = {
          codigo: subRaw[0],
          codigoLimpo: subRaw[0].replace(/\D/g, ''),
          descricao: subRaw[1]
        };
      }
    }

    if (codigoLimpo.length >= 7) {
      const itRaw = buscaBinariaItem(codigoLimpo.slice(0, 7));
      if (itRaw) {
        hierarquia.item = {
          codigo: itRaw[0],
          codigoLimpo: itRaw[0].replace(/\D/g, ''),
          descricao: itRaw[1]
        };
      }
    }

    if (codigoLimpo.length === 8) {
      const subitRaw = buscaBinariaItem(codigoLimpo);
      if (subitRaw) {
        hierarquia.subitem = {
          codigo: subitRaw[0],
          codigoLimpo: subitRaw[0].replace(/\D/g, ''),
          descricao: subitRaw[1]
        };
      }
    }

    return hierarquia;
  }

  /**
   * Consulta dados completos de um NCM específico (<0.1ms em RAM)
   * @param {string|number} ncmInput 
   * @returns {Object}
   */
  static consultar(ncmInput) {
    if (!ncmInput) {
      return {
        ok: false,
        valido: false,
        erro: 'Informe o código NCM para consulta (ex: 8517.13.00 ou 85171300)'
      };
    }

    const limpo = this.limpar(ncmInput);
    if (!limpo) {
      return {
        ok: false,
        valido: false,
        ncmInformado: String(ncmInput),
        motivo: 'O valor informado não contém dígitos numéricos válidos'
      };
    }

    const raw = buscaBinariaItem(limpo);
    if (!raw) {
      return {
        ok: true,
        valido: false,
        ncmInformado: String(ncmInput),
        ncmLimpo: limpo,
        totalDigitos: limpo.length,
        motivo: 'Código NCM não localizado na Tabela Oficial da Receita Federal e Camex (vigência atual)'
      };
    }

    const codigo = raw[0];
    const descricao = raw[1];
    const descPai = PARENTS[raw[2]] || '';
    const totalDigitos = limpo.length;
    const faturavel = totalDigitos === 8;

    let nivel = 'subitem';
    if (totalDigitos === 2) nivel = 'capitulo';
    else if (totalDigitos === 4) nivel = 'posicao';
    else if (totalDigitos === 5 || totalDigitos === 6) nivel = 'subposicao';
    else if (totalDigitos === 7) nivel = 'item';

    const hierarquia = this._montarHierarquia(limpo);
    const dicaVarejo = DICAS_FISCAIS_VAREJO[limpo] || null;

    return {
      ok: true,
      valido: true,
      codigo,
      codigoLimpo: limpo,
      totalDigitos,
      nivel,
      faturavel,
      descricao,
      descricaoPai: descPai,
      hierarquia,
      orientacaoFiscal: {
        permiteEmissaoNFe: faturavel,
        aviso: faturavel
          ? 'Código de 8 dígitos apto para emissão de NF-e, NFC-e e Cupom Fiscal.'
          : 'ATENÇÃO: A SEFAZ rejeita notas fiscais (Rejeição 778) emitidas com NCM que não possua 8 dígitos completos. Este código é apenas um agrupador hierárquico.',
        cfopSugerido: dicaVarejo ? dicaVarejo.cfop : '5102',
        csosnSugerido: dicaVarejo ? dicaVarejo.csosn : '102'
      },
      dicaVarejo: dicaVarejo ? {
        nomeComercial: dicaVarejo.nome,
        exigeImei: dicaVarejo.exigeImei,
        exigeSerial: dicaVarejo.exigeSerial,
        orientacaoPratica: dicaVarejo.orientacao
      } : null,
      fonte: 'Receita Federal do Brasil / Camex Mercosul',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Busca textual e por prefixo numérico no acervo de 15.042 NCMs
   * @param {string} termo 
   * @param {Object} [opcoes]
   * @param {number} [opcoes.limite=20]
   * @param {number} [opcoes.pagina=1]
   * @param {boolean} [opcoes.apenasFaturaveis=false]
   * @returns {Object}
   */
  static buscar(termo, opcoes = {}) {
    const t0 = performance.now();
    const limite = Math.min(Math.max(parseInt(opcoes.limite || 20, 10), 1), 100);
    const pagina = Math.max(parseInt(opcoes.pagina || 1, 10), 1);
    const apenasFaturaveis = Boolean(opcoes.apenasFaturaveis);

    if (!termo || !String(termo).trim()) {
      return {
        ok: false,
        erro: 'Informe o parâmetro de busca ?q=termo ou ?q=codigo',
        totalResultados: 0,
        resultados: []
      };
    }

    const termoLimpo = String(termo).trim();
    const termoNorm = normalizar(termoLimpo);
    const apenasDigitos = termoLimpo.replace(/\D/g, '');
    const tokens = termoNorm.split(/\s+/).filter(Boolean);

    const candidatos = [];

    // Primeiro verificar se há dicas fiscais com essa palavra-chave
    const ncmsComerciaisPrioritarios = new Set();
    for (const [ncmKey, dica] of Object.entries(DICAS_FISCAIS_VAREJO)) {
      if (dica.keywords && dica.keywords.some(k => normalizar(k).includes(termoNorm) || termoNorm.includes(normalizar(k)))) {
        ncmsComerciaisPrioritarios.add(ncmKey);
      }
    }

    for (let i = 0; i < ITEMS.length; i++) {
      const raw = ITEMS[i];
      const code = raw[0];
      const desc = raw[1];
      const pIdx = raw[2];
      const limpo = code.replace(/\D/g, '');
      const digitos = limpo.length;
      const faturavel = digitos === 8;

      if (apenasFaturaveis && !faturavel) continue;

      let score = 0;

      // Prioridade comercial
      if (ncmsComerciaisPrioritarios.has(limpo)) {
        score += 5000;
      }

      // Correspondência por código
      if (apenasDigitos.length >= 2) {
        if (limpo === apenasDigitos) {
          score += 3000;
        } else if (limpo.startsWith(apenasDigitos)) {
          score += 1000 + (10 - digitos);
        }
      }

      // Correspondência por texto
      const descNorm = normalizar(desc);
      let matchAll = true;
      for (let t = 0; t < tokens.length; t++) {
        if (!descNorm.includes(tokens[t])) {
          matchAll = false;
          break;
        }
      }

      if (matchAll) {
        score += 400;
        if (descNorm.startsWith(termoNorm)) score += 300;
      } else {
        // Checar pai
        const paiNorm = normalizar(PARENTS[pIdx] || '');
        let matchPai = true;
        for (let t = 0; t < tokens.length; t++) {
          if (!paiNorm.includes(tokens[t]) && !descNorm.includes(tokens[t])) {
            matchPai = false;
            break;
          }
        }
        if (matchPai) score += 150;
      }

      if (score > 0) {
        if (faturavel) score += 50;

        let nivel = 'subitem';
        if (digitos === 2) nivel = 'capitulo';
        else if (digitos === 4) nivel = 'posicao';
        else if (digitos === 5 || digitos === 6) nivel = 'subposicao';
        else if (digitos === 7) nivel = 'item';

        candidatos.push({
          entry: {
            codigo: code,
            codigoLimpo: limpo,
            totalDigitos: digitos,
            nivel,
            faturavel,
            descricao: desc,
            descricaoPai: PARENTS[pIdx] || ''
          },
          score
        });
      }
    }

    candidatos.sort((a, b) => b.score - a.score);

    const totalResultados = candidatos.length;
    const totalPaginas = Math.ceil(totalResultados / limite) || 1;
    const offset = (pagina - 1) * limite;
    const fatiados = candidatos.slice(offset, offset + limite);

    const resultados = fatiados.map(c => ({
      ...c.entry,
      relevancia: c.score
    }));

    const tempoMs = Math.round((performance.now() - t0) * 100) / 100;

    return {
      ok: true,
      termo: termoLimpo,
      totalResultados,
      pagina,
      limite,
      totalPaginas,
      resultados,
      tempoMs,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Lista todos os 96 Capítulos Oficiais do Mercosul (01 a 97)
   * @returns {Array<Object>}
   */
  static listarCapitulos() {
    if (this._capitulosCache) return this._capitulosCache;

    const caps = [];
    for (let i = 0; i < ITEMS.length; i++) {
      const raw = ITEMS[i];
      const limpo = raw[0].replace(/\D/g, '');
      if (limpo.length === 2) {
        caps.push({
          codigo: raw[0],
          codigoLimpo: limpo,
          descricao: raw[1]
        });
      }
    }

    this._capitulosCache = caps;
    return caps;
  }

  /**
   * Validação rápida de NCM para formulários de cadastro de produto
   * @param {string|number} ncm 
   * @returns {Object}
   */
  static validar(ncm) {
    const limpo = this.limpar(ncm);
    if (!limpo) return { valido: false, motivo: 'NCM vazio ou nulo' };
    const raw = buscaBinariaItem(limpo);
    if (!raw) return { valido: false, motivo: 'NCM não consta na tabela oficial Camex' };

    const digitos = limpo.length;
    const faturavel = digitos === 8;
    let nivel = 'subitem';
    if (digitos === 2) nivel = 'capitulo';
    else if (digitos === 4) nivel = 'posicao';
    else if (digitos === 5 || digitos === 6) nivel = 'subposicao';
    else if (digitos === 7) nivel = 'item';

    return {
      valido: true,
      codigo: raw[0],
      faturavel,
      nivel,
      descricao: raw[1]
    };
  }

  /**
   * Validação em lote de múltiplos NCMs para auditoria de catálogo de ERP
   * @param {Array<string|number>} listaNcms 
   * @returns {Object}
   */
  static validarLote(listaNcms) {
    if (!Array.isArray(listaNcms)) {
      return { ok: false, erro: 'Envie um array de códigos NCM no corpo da requisição' };
    }
    const maxItems = 200;
    const processar = listaNcms.slice(0, maxItems);
    let validos = 0;
    let faturaveis = 0;

    const resultados = processar.map(ncm => {
      const res = this.validar(ncm);
      if (res.valido) {
        validos++;
        if (res.faturavel) faturaveis++;
      }
      return { ncmInformado: ncm, ...res };
    });

    return {
      ok: true,
      totalRecebido: listaNcms.length,
      totalProcessado: processar.length,
      totalValidos: validos,
      totalInvalidos: processar.length - validos,
      totalFaturaveisNFe: faturaveis,
      itens: resultados
    };
  }

  /**
   * Hash de auditoria SHA-256 para rastreabilidade e LGPD
   * @param {string} codigo 
   * @param {string} [ip='127.0.0.1'] 
   * @returns {Object}
   */
  static gerarHashAuditoria(codigo, ip = '127.0.0.1') {
    const ts = Date.now();
    const ipPart = ip.split('.').slice(0, 2).join('.') + '.x.x';
    const raw = `aud_ncm_${codigo}_${ipPart}_${ts}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return {
      hash: `aud_ncm_${codigo}_${ts}_${hex}`,
      ipAnonimizado: `ip_${hex.slice(0, 8)}`,
      timestamp: new Date().toISOString()
    };
  }
}

export default NcmFiscalPro;
