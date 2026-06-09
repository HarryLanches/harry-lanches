let carrinho = [];
let produtoEmSelecao = null;
let categoriaAtiva = "Todos"; 

// ==========================================
// LÓGICA DE NAVEGAÇÃO E RENDERIZAÇÃO GERAL
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
        .then(() => console.log('PWA Pronto!'))
        .catch((err) => console.log('Erro no PWA:', err));
    });
}
function mostrarTela(idTela) {
  document.querySelectorAll(".container").forEach((t) => (t.style.display = "none"));
  document.getElementById(idTela).style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (idTela === "telaFinalizar") {
    let total = carrinho.reduce((sum, item) => sum + item.preco, 0);
    document.getElementById("valorTotalFinalizar").innerText = `R$ ${total.toFixed(2).replace(".", ",")}`;
    calcularFalta(); // Permite fechamento sem obrigar pagamento
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

function renderizarCategorias() {
  const menu = document.getElementById("menuCategorias");
  menu.innerHTML = "";
  const categoriasUnicas = ["Todos", ...new Set(dbProdutos.map(p => p.categoria))];

  categoriasUnicas.forEach(cat => {
    const classeAtivo = cat === categoriaAtiva ? "ativo" : "";
    menu.innerHTML += `
      <button class="btn-categoria ${classeAtivo}" onclick="selecionarCategoria('${cat}')">
        ${cat}
      </button>
    `;
  });
}

function selecionarCategoria(categoria) {
  categoriaAtiva = categoria;
  renderizarCategorias(); 
  filtrarProdutos();      
}

function carregarListaProdutos() {
  categoriaAtiva = "Todos"; 
  document.getElementById("inputBusca").value = ""; 
  renderizarCategorias();
  filtrarProdutos();
  mostrarTela("telaProdutos");
}

function filtrarProdutos() {
  let termo = document.getElementById("inputBusca").value.toLowerCase();
  let lista = document.getElementById("listaProdutos");
  lista.innerHTML = ""; 

  dbProdutos.forEach((prod, index) => {
    const passaBusca = prod.nome.toLowerCase().includes(termo);
    const passaCategoria = categoriaAtiva === "Todos" || prod.categoria === categoriaAtiva;

    if (passaBusca && passaCategoria) {
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
  document.getElementById("inputBuscaAdicionais").value = "";
  
  filtrarAdicionais();
  mostrarTela("telaAdicionais");
}

function filtrarAdicionais() {
  const termo = document.getElementById("inputBuscaAdicionais").value.toLowerCase();
  const lista = document.getElementById("listaAdicionais");
  const qtd = produtoEmSelecao ? produtoEmSelecao.qtd : 1;
  
  lista.innerHTML = ""; 
  
  dbAdicionais.forEach((add) => {
    if (add.nome.toLowerCase().includes(termo)) {
      let precoAddTotal = add.preco * qtd;
      lista.innerHTML += `
        <div class="produto-card" onclick="adicionarAdicional('${add.nome}', ${precoAddTotal})">
            <span>${add.nome}</span> <span>+ R$ ${precoAddTotal.toFixed(2)}</span>
        </div>
      `;
    }
  });
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

  let total = carrinho.reduce((sum, item) => sum + item.preco, 0);
  document.getElementById('valorTotalHeader').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// ==========================================
// LÓGICA DE PAGAMENTO (Opcional no PDV)
// ==========================================
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
    status.innerText = "Comanda vazia.";
    return;
  }

  if (Math.abs(diferenca) < 0.01) {
    status.style.color = "#25D366";
    status.innerText = `✅ Conta fechada!`;
  } else if (diferenca > 0) {
    status.style.color = "#ff4444";
    status.innerText = `Falta pagar: R$ ${diferenca.toFixed(2).replace(".", ",")}`;
  } else {
    status.style.color = "#ff4444";
    status.innerText = `Troco extra (Corrija): R$ ${Math.abs(diferenca).toFixed(2).replace(".", ",")}`;
  }
}

function calcularTroco() {
  const inputTroco = document.getElementById("inputTroco").value;
  const exibicaoTroco = document.getElementById("exibicaoTroco");
  const total = carrinho.reduce((sum, item) => sum + item.preco, 0);
  const valorPago = parseFloat(inputTroco);

  if (valorPago >= total) {
    const troco = valorPago - total;
    exibicaoTroco.innerText = `Dar troco de: R$ ${troco.toFixed(2).replace(".", ",")}`;
  } else if (valorPago > 0) {
    exibicaoTroco.innerText = "Valor insuficiente para troco.";
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

function imprimirComanda() {
    function quebrarTexto(texto, limite = 22) {
    if (!texto) return "";
    
    // Remove espaços extras
    texto = texto.toString().trim();
    
    let palavras = texto.split(' ');
    let linhas = [];
    let linhaAtual = "";

    for (let p of palavras) {
        // Se a palavra sozinha for maior que o limite, corta na marra
        if (p.length > limite) {
            if (linhaAtual) {
                linhas.push(linhaAtual);
                linhaAtual = "";
            }
            // Fatiar a palavra gigante
            for (let i = 0; i < p.length; i += limite) {
                linhas.push(p.substring(i, i + limite));
            }
        } else {
            // Verifica se cabe na linha
            let espaco = linhaAtual ? " " : "";
            if ((linhaAtual + espaco + p).length <= limite) {
                linhaAtual += espaco + p;
            } else {
                linhas.push(linhaAtual);
                linhaAtual = p;
            }
        }
    }
    if (linhaAtual) linhas.push(linhaAtual);
    return linhas.join('\n');
}

    // 2. Coleta de dados
    let mesa = document.getElementById("inputMesa").value.trim();
    let tipoConsumo = document.getElementById("selectConsumo").value;
    let obsGeral = document.getElementById("inputObsGeral").value;
    let total = carrinho.reduce((sum, item) => sum + item.preco, 0);

    // Validação
    if (carrinho.length === 0) return alert("A comanda está vazia!");
    if (!mesa) {
        alert("Por favor, digite o número da Mesa!");
        document.getElementById("inputMesa").focus();
        return;
    }

    // 3. Montagem do Cupom (Texto Puro)
    let dataAtual = new Date().toLocaleString();
    let cupom = `    HARRY LANCHES\n`;
    cupom += ` ${dataAtual}\n`;
    cupom += quebrarTexto("MESA: " + mesa.toUpperCase(), 22) + "\n";
    cupom += `   ${tipoConsumo.toUpperCase()}\n\n`;
    cupom += `----------------------\n`;

    carrinho.forEach((item) => {
        let base = `${item.qtd}x ${item.nome.toUpperCase()} R$${item.preco.toFixed(2).replace(".", ",")}`;
        let extras = [];
        if (item.adicionais && item.adicionais.length > 0) extras.push("+" + item.adicionais.map(a => a.nome.toUpperCase()).join(" +"));
        if (item.obs) extras.push(item.obs.toUpperCase());
        
        let linha = base + (extras.length > 0 ? " " + extras.join(" ") : "");
        cupom += quebrarTexto(linha, 22) + "\n";
    });

    cupom += `----------------------\n`;
    cupom += `TOTAL: R$ ${total.toFixed(2).replace(".", ",")}\n\n`;

    if (obsGeral && obsGeral.trim() !== "") {
    // Passamos o texto da observação pela mesma função que usamos para os itens
    cupom += `\nOBS GERAL:\n${quebrarTexto(obsGeral.toUpperCase(), 22)}\n`;
    }
    cupom += `\n\n\n`;

    // 4. Injeção no elemento oculto
    let elRecibo = document.getElementById("reciboImpressao");
    if (!elRecibo) {
        alert("Erro: Elemento de impressão não encontrado no HTML!");
        return;
    }
    
    elRecibo.innerHTML = `<pre>${cupom}</pre>`;
    
    // 5. Imprimir
    window.print();
}

function limparComanda() {
  if(confirm("Tem certeza que deseja apagar os dados e iniciar uma nova comanda?")) {
    carrinho = [];
    document.getElementById("inputMesa").value = "";
    document.getElementById("inputObsGeral").value = "";
    document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
    document.querySelectorAll('.input-pgto').forEach(i => { i.value = ""; i.style.display = "none"; });
    document.getElementById("containerTroco").style.display = "none";
    document.getElementById("inputTroco").value = "";
    document.getElementById("exibicaoTroco").innerText = "";
    
    atualizarResumoCarrinho();
    mostrarTela("telaCarrinho");
  }
}

// Interatividade de Arraste Horizontal para PC
const slider = document.querySelector('.scroll-categorias');
let isDown = false;
let startX;
let scrollLeft;

if (slider) {
    slider.addEventListener('mousedown', (e) => {
      isDown = true;
      slider.classList.add('active');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener('mouseleave', () => {
      isDown = false;
    });

    slider.addEventListener('mouseup', () => {
      isDown = false;
    });

    slider.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 2; 
      slider.scrollLeft = scrollLeft - walk;
    });
};