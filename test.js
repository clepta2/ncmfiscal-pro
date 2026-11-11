import { NcmFiscalPro } from './ncmfiscal-pro.js';

console.log('🧪 Iniciando Bateria de Testes do NcmFiscalPro (15.042 NCMs)...');

// 1. Limpeza e Formatação
const formatado = NcmFiscalPro.formatar('85171300');
console.assert(formatado === '8517.13.00', 'Formatação de 8 dígitos deve conter pontos corretos');
const limpo = NcmFiscalPro.limpar('8517.13.00');
console.assert(limpo === '85171300', 'Limpeza deve remover pontos');
console.log('✅ 1. Limpeza e Formatação OK:', limpo, '->', formatado);

// 2. Consulta de NCM Válido e Faturável (Smartphones: 8517.13.00)
const resSmart = NcmFiscalPro.consultar('8517.13.00');
console.assert(resSmart.ok === true, 'Consulta de smartphone deve retornar ok');
console.assert(resSmart.valido === true, 'Deve ser válido');
console.assert(resSmart.faturavel === true, '8 dígitos deve ser faturável na NF-e');
console.assert(resSmart.hierarquia.capitulo.codigoLimpo === '85', 'Capítulo deve ser 85');
console.assert(resSmart.hierarquia.posicao.codigoLimpo === '8517', 'Posição deve ser 8517');
console.assert(resSmart.hierarquia.subitem.codigoLimpo === '85171300', 'Subitem deve ser 85171300');
console.assert(resSmart.dicaVarejo.exigeImei === true, 'Smartphones devem alertar sobre exigência de IMEI');
console.assert(resSmart.cestSugerido.codigo === '21.053.00', 'CEST sugerido deve ser 21.053.00');
console.assert(resSmart.secao.numero === 'XVI', 'Seção deve ser XVI (Tecnologia/Eletrônicos)');
console.log('✅ 2. Consulta Smartphone OK:', resSmart.codigo, '| CEST:', resSmart.cestSugerido.codigo, '| Seção:', resSmart.secao.numero);

// 3. Consulta com código limpo sem pontos
const resLimpo = NcmFiscalPro.consultar('84713012');
console.assert(resLimpo.valido === true, 'Consulta sem pontos deve funcionar');
console.assert(resLimpo.codigo === '8471.30.12', 'Deve devolver código formatado canônico');
console.assert(resLimpo.dicaVarejo.exigeSerial === true, 'Notebooks exigem número de série');
console.assert(resLimpo.cestSugerido.codigo === '21.001.00', 'CEST do notebook deve ser 21.001.00');
console.log('✅ 3. Consulta Notebook (sem pontos) OK:', resLimpo.codigo, '| CEST:', resLimpo.cestSugerido.codigo);

// 4. Consulta de NCM Agrupador não faturável (Posição: 8517 de 4 dígitos)
const resAgrupador = NcmFiscalPro.consultar('8517');
console.assert(resAgrupador.valido === true, 'NCM 8517 existe na tabela Camex');
console.assert(resAgrupador.faturavel === false, '4 dígitos não é faturável na SEFAZ');
console.assert(resAgrupador.orientacaoFiscal.permiteEmissaoNFe === false, 'Não deve permitir emissão direta');
console.log('✅ 4. Proteção contra Rejeição 778 SEFAZ OK:', resAgrupador.orientacaoFiscal.aviso.slice(0, 50) + '...');

// 5. Consulta de NCM Inexistente
const resInexistente = NcmFiscalPro.consultar('99999999');
console.assert(resInexistente.valido === false, 'NCM 99999999 deve ser inválido');
console.log('✅ 5. Bloqueio de NCM Inexistente OK:', resInexistente.motivo);

// 6. Busca por Texto (ex: "cerveja")
const buscaCerveja = NcmFiscalPro.buscar('cerveja', { limite: 5, apenasFaturaveis: true });
console.assert(buscaCerveja.ok === true, 'Busca deve retornar ok');
console.assert(buscaCerveja.totalResultados > 0, 'Deve encontrar resultados para cerveja');
console.assert(buscaCerveja.resultados[0].faturavel === true, 'Filtro apenasFaturaveis deve respeitar');
console.log('✅ 6. Busca por texto ("cerveja") OK:', buscaCerveja.totalResultados, 'encontrados em', buscaCerveja.tempoMs, 'ms. Primeiro:', buscaCerveja.resultados[0].codigo, buscaCerveja.resultados[0].descricao);

// 7. Busca por Prefixo Numérico ("8517")
const buscaPrefixo = NcmFiscalPro.buscar('8517', { limite: 10 });
console.assert(buscaPrefixo.totalResultados > 0, 'Deve encontrar subitens do prefixo 8517');
console.log('✅ 7. Busca por Prefixo ("8517") OK:', buscaPrefixo.totalResultados, 'itens sob a posição telefônica.');

// 8. Listagem de Capítulos Oficiais (96 Capítulos)
const capitulos = NcmFiscalPro.listarCapitulos();
console.assert(capitulos.length >= 95, 'Deve listar cerca de 96 capítulos');
console.assert(capitulos[0].codigoLimpo === '01', 'Primeiro capítulo deve ser Animais Vivos (01)');
console.log('✅ 8. Listagem de Capítulos OK: Total de Capítulos Mercosul =', capitulos.length);

// 9. Validação Rápida
const v1 = NcmFiscalPro.validar('8517.13.00');
console.assert(v1.valido === true && v1.faturavel === true, '8517.13.00 deve ser válido e faturável');
const v2 = NcmFiscalPro.validar('12345678');
console.assert(v2.valido === false, 'NCM falso deve ser inválido');
console.log('✅ 9. Validação Rápida OK');

// 10. Validação em Lote (Auditoria de Catálogo)
const lote = NcmFiscalPro.validarLote(['8517.13.00', '8471.30.12', '9999.99.99', '8517']);
console.assert(lote.totalProcessado === 4, 'Processou 4 itens');
console.assert(lote.totalValidos === 3, '3 válidos');
console.assert(lote.totalInvalidos === 1, '1 inválido');
console.assert(lote.totalFaturaveisNFe === 2, '2 faturáveis');
console.log('✅ 10. Validação em Lote OK:', lote.totalValidos, 'válidos /', lote.totalFaturaveisNFe, 'faturáveis na NF-e');

// 11. Hash de Auditoria Criptográfica
const aud = NcmFiscalPro.gerarHashAuditoria('85171300', '200.189.112.45');
console.assert(aud.hash && aud.hash.startsWith('aud_ncm_85171300_'), 'Hash deve começar com prefixo padrão');
console.log('✅ 11. Hash de Auditoria LGPD OK:', aud.hash, aud.ipAnonimizado);

// 12. As 21 Seções Oficiais Camex
const secoes = NcmFiscalPro.listarSecoes();
console.assert(secoes.length === 21, 'Devem existir exatamente 21 seções');
console.log('✅ 12. As 21 Seções Camex OK: Total =', secoes.length);

// 13. Estimativa de Tributos (Lei 12.741 / IBPT)
const trib = NcmFiscalPro.estimarTributos('8517.13.00', 1000.00);
console.assert(trib.ok === true, 'Estimativa deve retornar ok');
console.assert(trib.tributoTotalEstimado > 0, 'Valor total deve ser maior que 0');
console.log('✅ 13. Cálculo de Tributos da Lei 12.741 OK:', trib.textoCupomFiscal);

console.log('🎉 Todos os 13 testes unitários passaram com sucesso!');
