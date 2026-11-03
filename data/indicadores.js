/* Indicadores pactuados da Diretoria (fonte: planilha "Painel_DIN_FUNPEC_completoVF").
   Colunas: eixo, indicador, métrica, frequência, meta dez/2026, meta jun/2027, tipo ("R$", "%" ou "").
   Para ler os realizados de uma planilha publicada, cole o link CSV em INDICADORES_CSV_URL
   (Arquivo > Compartilhar > Publicar na web > CSV). Colunas exigidas: Eixo | Indicador | Realizado. */
window.INDICADORES_CSV_URL = "";
window.EIXOS = {
  "Eixo I": "Prospecção e desenvolvimento tecnológico",
  "Eixo II": "Relação com empresas e mercado",
  "Eixo III": "Programas, projetos e editais",
  "Eixo IV": "Parcerias e redes de inovação",
  "Eixo V": "Sustentabilidade financeira e novos negócios"
};
window.INDICADORES = [
  ["Eixo I","Tecnologias mapeadas","Nº de tecnologias avaliadas","Trimestral",15,30,""],
  ["Eixo I","Projetos acompanhados","Nº de projetos inseridos na esteira","Mensal",5,12,""],
  ["Eixo I","Deep techs apoiadas","Nº de iniciativas acompanhadas","Mensal",3,8,""],
  ["Eixo I","Tecnologias licenciadas ou transferidas","Nº anual","Anual",1,3,""],
  ["Eixo I","Recursos captados para desenvolvimento tecnológico","R$ mobilizados","Mensal",200000,600000,"R$"],
  ["Eixo I","Projetos evoluídos entre estágios de maturidade","% de evolução","Trimestral",20,40,"%"],
  ["Eixo II","Empresas atendidas","Nº bimestral","Bimestral",10,25,""],
  ["Eixo II","Desafios empresariais mapeados","Nº mensal","Mensal",5,15,""],
  ["Eixo II","Projetos estruturados","Nº anual","Anual",4,10,""],
  ["Eixo II","Contratos apoiados pela Diretoria","Nº anual","Anual",3,8,""],
  ["Eixo II","Recursos privados mobilizados","R$ captados","Mensal",150000,450000,"R$"],
  ["Eixo II","Taxa de conversão de prospecções","%","Trimestral",15,25,"%"],
  ["Eixo III","Programas operados","Nº trimestral","Trimestral",3,6,""],
  ["Eixo III","Projetos coordenados","Nº trimestral","Trimestral",5,12,""],
  ["Eixo III","Instituições atendidas","Nº trimestral","Trimestral",8,15,""],
  ["Eixo III","Recursos geridos","R$","Mensal",500000,1200000,"R$"],
  ["Eixo III","Projetos aprovados em editais","Nº anual","Anual",2,6,""],
  ["Eixo III","Receita gerada por programas","R$","Mensal",100000,300000,"R$"],
  ["Eixo IV","Novas parcerias estratégicas","Nº bimestral","Bimestral",5,10,""],
  ["Eixo IV","Projetos estruturados","Nº bimestral","Bimestral",4,9,""],
  ["Eixo IV","Redes temáticas integradas","Nº bimestral","Bimestral",3,7,""],
  ["Eixo IV","Estados com atuação ativa","Nº bimestral","Bimestral",2,5,""],
  ["Eixo IV","Ambientes de inovação conectados","Nº bimestral","Bimestral",6,12,""],
  ["Eixo V","Receita associada à Diretoria","R$ mensal","Mensal",80000,200000,"R$"],
  ["Eixo V","Receita oriunda de inovação e novos negócios","%","Mensal",10,25,"%"],
  ["Eixo V","Fontes de receita ativas","Nº mensal","Mensal",3,6,""],
  ["Eixo V","Contratos recorrentes","Nº","Mensal",2,5,""],
  ["Eixo V","Receita privada mobilizada","R$ mensal","Mensal",60000,150000,"R$"],
  ["Eixo V","Recursos captados em editais estratégicos","R$ bimestral","Bimestral",100000,250000,"R$"]
];
