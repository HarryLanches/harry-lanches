let carrinho = [];
let produtoEmSelecao = null;

// ==========================================
// LÓGICA DE NAVEGAÇÃO E RENDERIZAÇÃO GERAL
// ==========================================

function mostrarTela(idTela) {
  document.querySelectorAll(".container").forEach((t) => (t.style.display = "none"));
  document.getElementById(idTela).style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (idTela === "telaFinalizar") {
    let total = carrinho.reduce((sum, item) => sum + item.preco, 0);
    document.getElementById("valorTotalFinalizar").innerText = `R$ ${total.toFixed(2).replace(".", ",")}`;
    atualizarOpcoesEntrega();
    calcularFalta(); // Recalcula os status de pagamento ao abrir
  }
}

function renderizarLanche(prod, index) {
  return `
    <div class="lanche-card">
        <div class="info-container">
            <span class="nome-lanche">${prod.nome}</span>
            <span class="preco-lanche" id="preco-${index}">R$ ${prod.preco.toFixed(2)}</span>
        </div>
        <div class="botoes-container">
            <div class="controle-qtd">
                <button class="btn-qtd" onclick="alterarQuantidade(${index}, -1, ${prod.preco})">-</button>
                <span id="qtd-${index}" class="qtd-texto">1</span>
                <button class="btn-qtd" onclick="alterarQuantidade(${index}, 1, ${prod.preco})">+</button>
            </div>
            <button class="btn-add-carrinho" onclick="selecionarParaAdicionais('${prod.nome}', ${index}, ${prod.preco})">Confirmar</button>
        </div>
    </div>
  `;
}

function carregarListaProdutos() {
  const lista = document.getElementById("listaProdutos");
  lista.innerHTML = "";
  
  // Ordenar ordem alfabetica para organização visual
  const dbOrdenado = [...dbProdutos].sort((a,b) => a.nome.localeCompare(b.nome));

  dbOrdenado.forEach((prod, index) => {
    // Como ordenamos, precisamos encontrar o index original no dbProdutos para manter a referencia
    let originalIndex = dbProdutos.indexOf(prod);
    lista.innerHTML += renderizarLanche(prod, originalIndex);
  });
  
  mostrarTela("telaProdutos");
}

function filtrarProdutos() {
  let termo = document.getElementById("inputBusca").value.toLowerCase();
  let lista = document.getElementById("listaProdutos");
  lista.innerHTML = "";

  dbProdutos.forEach((prod, index) => {
    if (prod.nome.toLowerCase().includes(termo)) {
      lista.innerHTML += renderizarLanche(prod, index);
    }
  });
}

function alterarQuantidade(index, delta, precoUnitario) {
  const elQtd = document.getElementById(`qtd-${index}`);
  let qtd = parseInt(elQtd.innerText) + delta;
  if (qtd < 1) qtd = 1;

  elQtd.innerText = qtd;
  const novoPreco = qtd * precoUnitario;
  document.getElementById(`preco-${index}`).innerText = `R$ ${novoPreco.toFixed(2)}`;
}

// ==========================================
// LÓGICA DE ADICIONAIS E CARRINHO
// ==========================================

function selecionarParaAdicionais(nome, index, precoUnitario) {
  let qtd = parseInt(document.getElementById(`qtd-${index}`).innerText);
  let precoTotal = qtd * precoUnitario;

  produtoEmSelecao = {
    nome,
    preco: precoTotal,
    qtd: qtd,
    adicionais: [],
    obs: "",
  };

  document.getElementById("listaAdicionaisSelecionados").innerHTML = "<small>Adicionais: Nenhum</small>";
  document.getElementById("inputObservacao").value = "";

  const lista = document.getElementById("listaAdicionais");
  lista.innerHTML = "";
  dbAdicionais.forEach((add) => {
    let precoAddTotal = add.preco * qtd;
    lista.innerHTML += `
      <div class="produto-card" onclick="adicionarAdicional('${add.nome}', ${precoAddTotal})">
          <span>${add.nome}</span> <span>+ R$ ${precoAddTotal.toFixed(2)}</span>
      </div>
    `;
  });
  mostrarTela("telaAdicionais");
}

function adicionarAdicional(nome, preco) {
  produtoEmSelecao.adicionais.push({ nome, preco });
  window.scrollTo({ top: 0, behavior: "smooth" });
  produtoEmSelecao.preco += preco;

  document.getElementById("listaAdicionaisSelecionados").innerHTML =
    "<strong>Selecionados:</strong> " +
    produtoEmSelecao.adicionais.map((a) => a.nome).join(", ");
}

function finalizarItem() {
  produtoEmSelecao.obs = document.getElementById("inputObservacao").value;
  carrinho.push(produtoEmSelecao);
  atualizarResumoCarrinho();
  mostrarTela("telaCarrinho");
}

function removerDoCarrinho(index) {
  carrinho.splice(index, 1);
  atualizarResumoCarrinho(); 
}

function atualizarResumoCarrinho() {
  const div = document.getElementById("itensCarrinho");
  div.innerHTML = "";

  carrinho.forEach((item, index) => {
    let adds = item.adicionais.length > 0
        ? `<br><small>+ ${item.adicionais.map((a) => a.nome).join(", ")}</small>`
        : "";
    let obs = item.obs ? `<br><small style="color:red">⚠️ Obs: ${item.obs}</small>` : "";

    div.innerHTML += `
      <div class="item-resumo" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
              <strong>${item.qtd}x ${item.nome}</strong> - R$ ${item.preco.toFixed(2)} ${adds} ${obs}
          </div>
          <button onclick="removerDoCarrinho(${index})" style="background: #ff4444; color: white; border: none; border-radius: 5px; padding: 5px 10px; cursor: pointer; font-weight: bold; margin-left: 10px;">X</button>
      </div>
    `;
  });

  // Atualiza o total no topo da tela inicial
  let total = carrinho.reduce((sum, item) => sum + item.preco, 0);
  document.getElementById('valorTotalHeader').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// ==========================================
// LÓGICA DE FINALIZAÇÃO E PAGAMENTO
// ==========================================

function atualizarOpcoesEntrega() {
  let tipo = document.getElementById("selectTipo").value;
  let inputEndereco = document.getElementById("inputEndereco");

  if (tipo === "Entrega") {
    inputEndereco.style.display = "block";
  } else {
    inputEndereco.style.display = "none";
    inputEndereco.value = "";
  }
}

function getSomaPagamentos() {
  let soma = 0;
  ["Dinheiro", "Pix", "Cartao"].forEach((metodo) => {
    let check = document.getElementById(`check${metodo}`);
    let input = document.getElementById(`valor${metodo}`);
    if (check && check.checked) {
      soma += parseFloat(input.value) || 0;
    }
  });
  return soma;
}

function togglePagamento(metodo) {
  let total = carrinho.reduce((sum, item) => sum + item.preco, 0);
  let check = document.getElementById(`check${metodo}`);
  let input = document.getElementById(`valor${metodo}`);

  if (check.checked) {
    input.style.display = "block";
    let somaAtual = getSomaPagamentos();
    let falta = total - somaAtual;

    if (falta > 0 && (!input.value || input.value == 0)) {
      input.value = falta.toFixed(2);
    }
  } else {
    input.style.display = "none";
    input.value = "";
  }

  if (metodo === "Dinheiro") {
    let containerTroco = document.getElementById("containerTroco");
    if (check.checked) {
      containerTroco.style.display = "block";
    } else {
      containerTroco.style.display = "none";
      document.getElementById("inputTroco").value = "";
      document.getElementById("checkboxSemTroco").checked = false;
      document.getElementById("inputTroco").disabled = false;
    }
  }

  calcularFalta();
}

function calcularFalta() {
  let total = carrinho.reduce((sum, item) => sum + item.preco, 0);
  let soma = getSomaPagamentos();
  let diferenca = total - soma;
  let status = document.getElementById("statusPagamento");

  if (total === 0) {
    status.innerText = "Carrinho vazio.";
    return;
  }

  let checados = document.querySelectorAll('input[type="checkbox"][id^="check"]:checked').length;
  if (checados === 0) {
    status.style.color = "#ff4444";
    status.innerText = `⚠️ Selecione uma forma de pagamento.`;
    return;
  }

  if (Math.abs(diferenca) < 0.01) {
    status.style.color = "#25D366";
    status.innerText = `✅ Pagamento exato! Pode finalizar.`;
  } else if (diferenca > 0) {
    status.style.color = "#ff4444";
    status.innerText = `⚠️ Ainda falta: R$ ${diferenca.toFixed(2).replace(".", ",")}`;
  } else {
    status.style.color = "#ff4444";
    status.innerText = `⚠️ Passou do valor em: R$ ${Math.abs(diferenca).toFixed(2).replace(".", ",")} (Corrija)`;
  }
}

function calcularTroco() {
  const inputTroco = document.getElementById("inputTroco").value;
  const exibicaoTroco = document.getElementById("exibicaoTroco");
  const total = carrinho.reduce((sum, item) => sum + item.preco, 0);
  const valorPago = parseFloat(inputTroco);

  if (valorPago >= total) {
    const troco = valorPago - total;
    exibicaoTroco.innerText = `Troco estimado: R$ ${troco.toFixed(2).replace(".", ",")}`;
  } else if (valorPago > 0) {
    exibicaoTroco.innerText = "Valor insuficiente para cobrir o total.";
  } else {
    exibicaoTroco.innerText = "";
  }
}

function toggleTrocoTexto() {
  let semTroco = document.getElementById("checkboxSemTroco").checked;
  let inputTroco = document.getElementById("inputTroco");

  if (semTroco) {
    inputTroco.value = "";
    inputTroco.disabled = true;
  } else {
    inputTroco.disabled = false;
  }
}

function concluirPedidoWhatsApp() {
  let end = document.getElementById("inputEndereco").value;
  let tipo = document.getElementById("selectTipo").value;
  let troco = document.getElementById("inputTroco").value;
  let semTroco = document.getElementById("checkboxSemTroco").checked;
  let obsGeral = document.getElementById("inputObsGeral").value;

  let total = carrinho.reduce((sum, item) => sum + item.preco, 0);
  let somaPagamentos = getSomaPagamentos();
  let diferenca = total - somaPagamentos;

  let checados = document.querySelectorAll('input[type="checkbox"][id^="check"]:checked').length;

  // Validações
  if (carrinho.length === 0) return alert("Seu carrinho está vazio!");
  if (tipo === "Entrega" && !end) return alert("Por favor, digite o endereço de entrega!");
  if (checados === 0) return alert("Selecione pelo menos uma forma de pagamento!");

  if (Math.abs(diferenca) > 0.01) {
    if (diferenca > 0) {
      return alert(`Os valores do pagamento não fecham a conta.\nFalta adicionar: R$ ${diferenca.toFixed(2).replace(".", ",")}`);
    } else {
      return alert(`Os valores do pagamento ultrapassam o total da conta em R$ ${Math.abs(diferenca).toFixed(2).replace(".", ",")}.\nPor favor, ajuste.`);
    }
  }
// ==========================================
// LÓGICA DE HORÁRIO DE FUNCIONAMENTO (CONTÍNUA)
// ==========================================

function verificarExpediente() {
  const agora = new Date();
  const hora = agora.getHours();
  const minuto = agora.getMinutes();
  const horaAtualDecimal = hora + (minuto / 60);

  const abreAs = 17.5;  // 17:30
  const fechaAs = 23.0; // 23:00

  let lojaFechada = false;

  // Verifica se a loja está fechada
  if (horaAtualDecimal < abreAs || horaAtualDecimal >= fechaAs) {
    lojaFechada = true;
  }

  // Se estiver fechado, mostra a tela
  if (lojaFechada) {
    document.querySelectorAll(".container").forEach((t) => (t.style.display = "none"));
    document.getElementById("telaFechado").style.display = "block";
    
    const linkAdmin = document.querySelector('a[onclick="acessarAdmin(); return false;"]');
    if (linkAdmin) linkAdmin.parentElement.style.display = "none";
  } else {
    // Se estiver aberto, garante que a tela de fechado fique escondida
    document.getElementById("telaFechado").style.display = "none";
  }
}

// Executa imediatamente ao carregar
verificarExpediente();

// --- NOVIDADE: Verifica a cada 60 segundos (1 minuto) ---
setInterval(verificarExpediente, 60000);
  // Montar Texto do WhatsApp
  let temDinheiro = document.getElementById("checkDinheiro").checked;
  let linhas = [];

  linhas.push(`*TIPO:* ${tipo}`);

  if (tipo === "Entrega") {
    linhas.push(`*ENDEREÇO:* ${end}`);
  }

  linhas.push("");
  linhas.push("━━━━━━━━━━━━━━━");

  linhas.push("");
  linhas.push("*ITENS DO PEDIDO:*");
  linhas.push("");

  carrinho.forEach((i) => {
    linhas.push(`*${i.qtd}x ${i.nome}*`);
    linhas.push(`R$ ${i.preco.toFixed(2).replace(".", ",")}`);

    if (i.adicionais && i.adicionais.length > 0) {
      linhas.push(`+ ${i.adicionais.map((a) => a.nome).join(", ")}`);
    }

    if (i.obs) {
      linhas.push(` ${i.obs}`);
    }
    linhas.push("");
  });

  linhas.push("━━━━━━━━━━━━━━━");
  linhas.push(`*TOTAL: R$ ${total.toFixed(2).replace(".", ",")}*`);
  linhas.push("");
  linhas.push("*PAGAMENTO*");

  ["Dinheiro", "Pix", "Cartao"].forEach((metodo) => {
    const check = document.getElementById(`check${metodo}`);
    const input = document.getElementById(`valor${metodo}`);
    if (check && check.checked) {
      const valor = parseFloat(input.value) || 0;
      const nomeReal = metodo === "Cartao" ? "Cartão" : metodo;
      linhas.push(`• ${nomeReal}: R$ ${valor.toFixed(2).replace(".", ",")}`);
    }
  });

  if (temDinheiro) {
    let textoTroco = "Não informado";
    if (semTroco) {
      textoTroco = "Sem troco";
    } else if (troco) {
      textoTroco = `Troco para R$ ${parseFloat(troco).toFixed(2).replace(".", ",")}`;
    }
    linhas.push(`${textoTroco}`);
  }

  if (obsGeral) {
    linhas.push("");
    linhas.push("*OBSERVAÇÃO GERAL*");
    linhas.push(obsGeral);
  }

  const texto = linhas.join("\n");
  const numeroWhatsApp = "75998662255";

  window.location.href = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(texto)}`;
}
