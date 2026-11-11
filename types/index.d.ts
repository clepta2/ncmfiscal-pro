/**
 * NcmFiscalPro TypeScript Definitions
 * @license MIT
 */

export interface NcmHierarquiaNivel {
  codigo: string;
  codigoLimpo: string;
  descricao: string;
}

export interface NcmHierarquia {
  capitulo?: NcmHierarquiaNivel;
  posicao?: NcmHierarquiaNivel;
  subposicao?: NcmHierarquiaNivel;
  item?: NcmHierarquiaNivel;
  subitem?: NcmHierarquiaNivel;
}

export interface NcmSecao {
  numero: string;
  nome: string;
  icone: string;
  aliquotasMedias?: {
    nac: number;
    imp: number;
    est: number;
    mun: number;
  };
}

export interface NcmTributacaoAproximada {
  federalNacionalPercentual: number;
  federalImportadoPercentual: number;
  estadualPercentual: number;
  municipalPercentual: number;
  fonte: string;
}

export interface NcmCestSugerido {
  codigo: string;
  segmento: string;
  descricao: string;
}

export interface NcmDicaVarejo {
  nomeComercial: string;
  exigeImei: boolean;
  exigeSerial: boolean;
  orientacaoPratica: string;
}

export interface NcmOrientacaoFiscal {
  permiteEmissaoNFe: boolean;
  aviso: string;
  cfopSugerido: string;
  csosnSugerido: string;
}

export interface NcmAuditoria {
  hash: string;
  ipAnonimizado: string;
  timestamp: string;
}

export interface NcmConsultaResultado {
  ok: boolean;
  valido: boolean;
  codigo?: string;
  codigoLimpo?: string;
  totalDigitos?: number;
  nivel?: 'capitulo' | 'posicao' | 'subposicao' | 'item' | 'subitem';
  faturavel?: boolean;
  descricao?: string;
  descricaoPai?: string;
  secao?: NcmSecao | null;
  hierarquia?: NcmHierarquia;
  tributacaoAproximada?: NcmTributacaoAproximada | null;
  cestSugerido?: NcmCestSugerido | null;
  orientacaoFiscal?: NcmOrientacaoFiscal;
  dicaVarejo?: NcmDicaVarejo | null;
  fonte?: string;
  timestamp?: string;
  motivo?: string;
  erro?: string;
  auditoria?: NcmAuditoria;
}

export interface NcmEstimativaTributosResultado {
  ok: boolean;
  ncm?: string;
  valorProduto?: number;
  valorProdutoFormatado?: string;
  tributoFederalEstimado?: number;
  tributoEstadualEstimado?: number;
  tributoTotalEstimado?: number;
  tributoTotalFormatado?: string;
  percentualTotal?: number;
  textoCupomFiscal?: string;
  erro?: string;
}

export interface NcmItemBusca {
  codigo: string;
  codigoLimpo: string;
  totalDigitos: number;
  nivel: string;
  faturavel: boolean;
  descricao: string;
  descricaoPai: string;
  relevancia: number;
}

export interface NcmBuscaResultado {
  ok: boolean;
  termo: string;
  totalResultados: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  resultados: NcmItemBusca[];
  tempoMs: number;
  timestamp: string;
  erro?: string;
}

export interface NcmCapitulo {
  codigo: string;
  codigoLimpo: string;
  descricao: string;
  secao?: {
    numero: string;
    nome: string;
    icone: string;
  } | null;
}

export interface NcmValidacaoSimples {
  valido: boolean;
  codigo?: string;
  faturavel?: boolean;
  nivel?: string;
  descricao?: string;
  motivo?: string;
}

export interface NcmValidacaoLoteResultado {
  ok: boolean;
  totalRecebido: number;
  totalProcessado: number;
  totalValidos: number;
  totalInvalidos: number;
  totalFaturaveisNFe: number;
  itens: Array<{ ncmInformado: string | number } & NcmValidacaoSimples>;
  erro?: string;
}

export class NcmFiscalPro {
  static limpar(ncm: string | number): string;
  static formatar(ncm: string | number): string;
  static consultar(ncmInput: string | number): NcmConsultaResultado;
  static estimarTributos(ncmInput: string | number, valorProduto?: number): NcmEstimativaTributosResultado;
  static buscar(termo: string, opcoes?: { limite?: number; pagina?: number; apenasFaturaveis?: boolean }): NcmBuscaResultado;
  static listarCapitulos(): NcmCapitulo[];
  static listarSecoes(): Array<NcmSecao & { capitulos: string[] }>;
  static validar(ncm: string | number): NcmValidacaoSimples;
  static validarLote(listaNcms: Array<string | number>): NcmValidacaoLoteResultado;
  static gerarHashAuditoria(codigo: string, ip?: string): NcmAuditoria;
}

export default NcmFiscalPro;
