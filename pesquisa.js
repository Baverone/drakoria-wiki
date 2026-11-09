// Pesquisa da wiki: carrega o pesquisa.json (na mesma pasta da página) e filtra no navegador.
// Os resultados são montados com a API do DOM e textContent; nada do índice entra como HTML.
(function () {
  'use strict';

  var MAXIMO = 20;
  var caixa = document.getElementById('pesquisa-caixa');
  var lista = document.getElementById('pesquisa-resultados');
  var menu = document.querySelector('.menu-caixa');

  // No ecrã largo o menu está sempre aberto; no telemóvel começa fechado.
  if (menu && window.matchMedia) {
    var largo = window.matchMedia('(min-width: 900px)');
    var ajustar = function () { menu.open = largo.matches; };
    ajustar();
    if (largo.addEventListener) { largo.addEventListener('change', ajustar); }
  }

  if (!caixa || !lista) { return; }

  // Sem acentos nem maiúsculas: «Ação» e «acao» encontram-se.
  function normalizar(texto) {
    return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function endereco(slug) {
    return slug === 'inicio' ? 'index.html' : slug + '.html';
  }

  var indice = null;
  var pedido = null;

  function carregar() {
    if (!pedido) {
      pedido = fetch('pesquisa.json', { credentials: 'same-origin' })
        .then(function (r) {
          if (!r.ok) { throw new Error('pesquisa.json: ' + r.status); }
          return r.json();
        })
        .then(function (dados) {
          indice = dados.map(function (e) {
            return { entrada: e, titulo: normalizar(e.titulo), texto: normalizar(e.texto) };
          });
        });
      pedido.catch(function () { pedido = null; });
    }
    return pedido;
  }

  function procurar(consulta) {
    var palavras = normalizar(consulta).split(/\s+/).filter(Boolean);
    if (!palavras.length) { return []; }
    var achados = [];
    indice.forEach(function (item) {
      var pontos = 0;
      for (var i = 0; i < palavras.length; i++) {
        var notitulo = item.titulo.indexOf(palavras[i]) !== -1;
        var notexto = item.texto.indexOf(palavras[i]) !== -1;
        if (!notitulo && !notexto) { return; }   // todas as palavras têm de aparecer
        pontos += notitulo ? 2 : 1;
      }
      achados.push({ item: item, pontos: pontos });
    });
    // Estável: a ordem das páginas desempata.
    achados.sort(function (a, b) { return b.pontos - a.pontos; });
    return achados.slice(0, MAXIMO).map(function (a) { return a.item; });
  }

  // Um trecho do texto à volta da primeira palavra; só se a normalização não mudou os comprimentos.
  function trecho(item, palavra) {
    var original = item.entrada.texto;
    if (original.length !== item.texto.length) { return original.slice(0, 120); }
    var pos = Math.max(item.texto.indexOf(palavra), 0);
    var inicio = Math.max(pos - 40, 0);
    var fim = Math.min(pos + 100, original.length);
    return (inicio > 0 ? '… ' : '') + original.slice(inicio, fim) + (fim < original.length ? ' …' : '');
  }

  function mostrar(achados, consulta) {
    lista.textContent = '';
    var palavra = normalizar(consulta).split(/\s+/).filter(Boolean)[0] || '';
    if (!achados.length) {
      var vazio = document.createElement('li');
      vazio.className = 'sem-resultados';
      vazio.textContent = 'Nada encontrado.';
      lista.appendChild(vazio);
    }
    achados.forEach(function (item) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = endereco(item.entrada.slug);
      var titulo = document.createElement('strong');
      titulo.textContent = item.entrada.titulo;
      var excerto = document.createElement('span');
      excerto.textContent = trecho(item, palavra);
      a.appendChild(titulo);
      a.appendChild(excerto);
      li.appendChild(a);
      lista.appendChild(li);
    });
    lista.hidden = false;
  }

  function atualizar() {
    var consulta = caixa.value;
    if (!consulta.trim()) { lista.hidden = true; lista.textContent = ''; return; }
    carregar().then(function () {
      if (caixa.value === consulta) { mostrar(procurar(consulta), consulta); }
    }).catch(function () {
      lista.textContent = '';
      var erro = document.createElement('li');
      erro.className = 'sem-resultados';
      erro.textContent = 'Não foi possível carregar a pesquisa.';
      lista.appendChild(erro);
      lista.hidden = false;
    });
  }

  caixa.addEventListener('input', atualizar);
  caixa.addEventListener('focus', function () { carregar().catch(function () {}); atualizar(); });
  caixa.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { caixa.value = ''; atualizar(); }
    if (ev.key === 'Enter') {
      var primeiro = lista.querySelector('a');
      if (primeiro) { location.href = primeiro.href; }
    }
    if (ev.key === 'ArrowDown') {
      var seguinte = lista.querySelector('a');
      if (seguinte) { ev.preventDefault(); seguinte.focus(); }
    }
  });
  lista.addEventListener('keydown', function (ev) {
    var atual = document.activeElement;
    var li = atual && atual.closest ? atual.closest('li') : null;
    if (!li) { return; }
    var vizinho = ev.key === 'ArrowDown' ? li.nextElementSibling : ev.key === 'ArrowUp' ? li.previousElementSibling : null;
    if (ev.key === 'ArrowUp' && !vizinho) { ev.preventDefault(); caixa.focus(); return; }
    if (vizinho && vizinho.querySelector('a')) { ev.preventDefault(); vizinho.querySelector('a').focus(); }
  });
  // Clicar fora fecha a lista.
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest || !ev.target.closest('.pesquisa')) { lista.hidden = true; }
  });
})();
