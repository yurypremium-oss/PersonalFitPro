import './style.css'
import { supabase } from './lib/supabase'

// ======================================================
// VARIÁVEIS GLOBAIS
// ======================================================

window.usuarioAtual = null
window.treinosAlunoGrupos = {}
window.divisaoTreinoAlunoAtual = null

// ======================================================
// UTILITÁRIOS
// ======================================================

function escaparHtml(valor) {
  if (valor === null || valor === undefined) {
    return ''
  }

  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function transformarYoutubeEmbed(url) {
  if (!url) return null

  try {
    const urlObj = new URL(url)

    let videoId = ''

    if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.replace('/', '')
    }

    if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v') || ''

      if (!videoId && urlObj.pathname.includes('/shorts/')) {
        videoId = urlObj.pathname.split('/shorts/')[1]
      }

      if (!videoId && urlObj.pathname.includes('/embed/')) {
        videoId = urlObj.pathname.split('/embed/')[1]
      }
    }

    if (!videoId) {
      return null
    }

    videoId = videoId.split('&')[0]
    videoId = videoId.split('?')[0]

    return `https://www.youtube.com/embed/${videoId}`
  } catch {
    return null
  }
}

// ======================================================
// VÍDEO
// ======================================================

function abrirVideo(url) {
  const embedUrl = transformarYoutubeEmbed(url)

  if (!embedUrl) {
    alert('Não foi possível abrir este vídeo.')
    return
  }

  const modalExistente = document.getElementById('video-modal')

  if (modalExistente) {
    modalExistente.remove()
  }

  const modal = document.createElement('div')

  modal.id = 'video-modal'

  modal.innerHTML = `
    <div
      class="video-modal-overlay"
      onclick="fecharVideo(event)"
    >
      <div
        class="video-modal-content"
        onclick="event.stopPropagation()"
      >
        <button
          class="video-modal-close"
          onclick="fecharVideo()"
        >
          ✕
        </button>

        <div class="video-container">
          <iframe
            src="${embedUrl}"
            title="Demonstração do exercício"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>

        <div class="video-modal-footer">
          <a
            href="${url}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir no YouTube ↗
          </a>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)
}

function fecharVideo() {
  const modal = document.getElementById('video-modal')

  if (modal) {
    modal.remove()
  }
}

window.abrirVideo = abrirVideo
window.fecharVideo = fecharVideo

// ======================================================
// LOGIN
// ======================================================

async function realizarLogin(email, senha) {
  const mensagem = document.getElementById('login-message')

  if (mensagem) {
    mensagem.innerHTML = ''
  }

  const {
    data,
    error
  } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  })

  if (error) {
    console.error(error)

    if (mensagem) {
      mensagem.innerHTML = `
        <div class="message error">
          E-mail ou senha incorretos.
        </div>
      `
    }

    return
  }

  window.usuarioAtual = data.user

  await identificarUsuario(data.user)
}

// ======================================================
// TELA DE LOGIN
// ======================================================

function mostrarLogin() {
  const app = document.getElementById('app')

  app.innerHTML = `
    <div class="login-container">

      <div class="login-card">

        <div class="login-logo">
          🏋️
        </div>

        <h1>
          Personal Fit Pro
        </h1>

        <p class="login-subtitle">
          Gestão profissional de treinos e alunos
        </p>

        <form id="login-form">

          <label>
            E-mail

            <input
              id="login-email"
              type="email"
              placeholder="Digite seu e-mail"
              autocomplete="email"
              required
            >
          </label>

          <label>
            Senha

            <input
              id="login-password"
              type="password"
              placeholder="Digite sua senha"
              autocomplete="current-password"
              required
            >
          </label>

          <button
            type="submit"
            class="primary-button"
          >
            Entrar
          </button>

        </form>

        <div id="login-message"></div>

      </div>

    </div>
  `

  const form = document.getElementById('login-form')

  form.addEventListener('submit', async event => {
    event.preventDefault()

    const email = document
      .getElementById('login-email')
      .value
      .trim()

    const senha = document
      .getElementById('login-password')
      .value

    await realizarLogin(email, senha)
  })
}

// ======================================================
// IDENTIFICAR USUÁRIO
// ======================================================

async function identificarUsuario(user) {
  window.usuarioAtual = user

  const app = document.getElementById('app')

  const {
    data: perfil,
    error
  } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error(error)

    app.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="message error">
            Erro ao carregar seu perfil.
          </div>
        </div>
      </div>
    `

    return
  }

  if (!perfil) {
    app.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="message error">
            Perfil de usuário não encontrado.
          </div>
        </div>
      </div>
    `

    return
  }

  if (!perfil.ativo) {
    app.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="message error">
            Seu acesso está desativado.
          </div>
        </div>
      </div>
    `

    return
  }

  if (perfil.tipo === 'professor') {
    await mostrarAreaProfessor(user)
  } else {
    await mostrarAreaAluno(user)
  }
}

// ======================================================
// TOPBAR
// ======================================================

function criarTopbar(nome) {
  return `
    <header class="topbar">

      <h1>
        Personal Fit Pro
      </h1>

      <div class="topbar-user">

        <span>
          ${escaparHtml(nome)}
        </span>

        <button
          class="secondary-button"
          onclick="fazerLogout()"
        >
          Sair
        </button>

      </div>

    </header>
  `
}

// ======================================================
// LOGOUT
// ======================================================

async function fazerLogout() {
  await supabase.auth.signOut()

  window.usuarioAtual = null
  window.treinosAlunoGrupos = {}
  window.divisaoTreinoAlunoAtual = null

  mostrarLogin()
}

window.fazerLogout = fazerLogout

// ======================================================
// ÁREA DO PROFESSOR
// ======================================================

async function mostrarAreaProfessor(user) {
  window.usuarioAtual = user

  const app = document.getElementById('app')

  const {
    data: perfil
  } = await supabase
    .from('perfis')
    .select('nome')
    .eq('id', user.id)
    .single()

  app.innerHTML = `
    <div class="app-container">

      ${criarTopbar(
        perfil?.nome || 'Professor'
      )}

      <main class="main-content">

        <div class="welcome-card">

          <div class="welcome-icon">
            🏋️
          </div>

          <div>
            <h2>
              Olá,
              ${escaparHtml(
                perfil?.nome || 'Professor'
              )}!
            </h2>

            <p>
              Gerencie seus alunos, treinos e avaliações.
            </p>
          </div>

        </div>

        <div class="dashboard-grid">

          <button
            class="dashboard-card"
            onclick="mostrarAlunosProfessor()"
          >
            <div class="dashboard-icon">
              👥
            </div>

            <strong>
              Alunos
            </strong>

            <small>
              Gerenciar alunos cadastrados
            </small>
          </button>

          <button
            class="dashboard-card"
            onclick="mostrarMensagemProfessor('Treinos')"
          >
            <div class="dashboard-icon">
              🏋️
            </div>

            <strong>
              Treinos
            </strong>

            <small>
              Gerenciar treinos
            </small>
          </button>

          <button
            class="dashboard-card"
            onclick="mostrarMensagemProfessor('Progresso')"
          >
            <div class="dashboard-icon">
              📊
            </div>

            <strong>
              Progresso
            </strong>

            <small>
              Avaliações e evolução
            </small>
          </button>

          <button
            class="dashboard-card"
            onclick="mostrarMensagemProfessor('Configurações')"
          >
            <div class="dashboard-icon">
              ⚙️
            </div>

            <strong>
              Configurações
            </strong>

            <small>
              Configurações do sistema
            </small>
          </button>

        </div>

        <section id="professor-content"></section>

      </main>

    </div>
  `
}

// ======================================================
// MENSAGEM PROFESSOR
// ======================================================

function mostrarMensagemProfessor(titulo) {
  const area = document.getElementById(
    'professor-content'
  )

  if (!area) return

  area.innerHTML = `
    <div class="empty-state">

      <h3>
        ${escaparHtml(titulo)}
      </h3>

      <p>
        Esta área será desenvolvida na próxima etapa.
      </p>

    </div>
  `
}

window.mostrarMensagemProfessor =
  mostrarMensagemProfessor

// ======================================================
// LISTA DE ALUNOS
// ======================================================

async function mostrarAlunosProfessor() {
  console.log('Abrindo lista de alunos...')

  const area = document.getElementById(
    'professor-content'
  )

  if (!area) {
    console.error(
      'Área professor-content não encontrada.'
    )

    return
  }

  area.innerHTML = `
    <div class="section-header">

      <div>
        <h2>
          Meus alunos
        </h2>

        <p>
          Selecione um aluno para acessar sua ficha.
        </p>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">

        <button
          class="primary-button"
          onclick="mostrarFormularioNovoAluno()"
        >
          + Cadastrar aluno
        </button>

        <button
          class="secondary-button"
          onclick="mostrarAreaProfessorAtual()"
        >
          ← Voltar
        </button>

      </div>

    </div>

    <div id="lista-alunos">

      <div class="message info">
        Carregando alunos...
      </div>

    </div>
  `

  const {
    data: alunos,
    error
  } = await supabase
    .from('alunos')
    .select('*')
    .order('nome', {
      ascending: true
    })

  const lista = document.getElementById(
    'lista-alunos'
  )

  if (error) {
    console.error(error)

    lista.innerHTML = `
      <div class="message error">
        Erro ao carregar alunos.
      </div>
    `

    return
  }

  if (!alunos || alunos.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">

        <h3>
          Nenhum aluno cadastrado
        </h3>

        <p>
          Cadastre um aluno para começar.
        </p>

      </div>
    `

    return
  }

  lista.innerHTML = alunos
    .map(aluno => {

      const inicial = aluno.nome
        ? aluno.nome.charAt(0).toUpperCase()
        : '?'

      return `
        <div
          class="student-row student-row-clickable"
          onclick="mostrarFichaAluno('${aluno.id}')"
        >

          <div class="student-avatar">
            ${escaparHtml(inicial)}
          </div>

          <div class="student-info">

            <strong>
              ${escaparHtml(aluno.nome)}
            </strong>

            <span>
              ${escaparHtml(
                aluno.email || 'Sem e-mail'
              )}
            </span>

          </div>

          <div class="student-status">
            ${aluno.ativo ? 'Ativo' : 'Inativo'}
          </div>

          <div class="student-arrow">
            ›
          </div>

        </div>
      `
    })
    .join('')
}

window.mostrarAlunosProfessor =
  mostrarAlunosProfessor

// ======================================================
// NOVO ALUNO
// ======================================================

function mostrarFormularioNovoAluno() {
  const area = document.getElementById(
    'professor-content'
  )

  if (!area) return

  area.innerHTML = `
    <div class="section-header">

      <div>
        <h2>
          Cadastrar novo aluno
        </h2>

        <p>
          Preencha os dados do aluno.
        </p>
      </div>

      <button
        class="secondary-button"
        onclick="mostrarAlunosProfessor()"
      >
        ← Voltar para alunos
      </button>

    </div>

    <div class="form-card">

      <form id="novo-aluno-form">

        <div class="form-group">

          <label for="novo-aluno-nome">
            Nome completo
          </label>

          <input
            id="novo-aluno-nome"
            type="text"
            placeholder="Digite o nome completo"
            required
          >

        </div>

        <div class="form-group">

          <label for="novo-aluno-email">
            E-mail
          </label>

          <input
            id="novo-aluno-email"
            type="email"
            placeholder="Digite o e-mail"
          >

        </div>

        <div class="form-group">

          <label>
            Status
          </label>

          <label style="display:flex;align-items:center;gap:8px;">
            <input
              id="novo-aluno-ativo"
              type="checkbox"
              checked
            >

            Aluno ativo
          </label>

        </div>

        <div
          id="novo-aluno-message"
          style="margin-bottom:15px;"
        ></div>

        <div
          style="
            display:flex;
            gap:10px;
            flex-wrap:wrap;
          "
        >

          <button
            type="submit"
            class="primary-button"
          >
            💾 Salvar aluno
          </button>

          <button
            type="button"
            class="secondary-button"
            onclick="mostrarAlunosProfessor()"
          >
            Cancelar
          </button>

        </div>

      </form>

    </div>
  `

  const form = document.getElementById(
    'novo-aluno-form'
  )

  form.addEventListener(
    'submit',
    salvarNovoAluno
  )
}

window.mostrarFormularioNovoAluno =
  mostrarFormularioNovoAluno

// ======================================================
// SALVAR NOVO ALUNO
// ======================================================

async function salvarNovoAluno(event) {
  event.preventDefault()

  const nome = document
    .getElementById('novo-aluno-nome')
    .value
    .trim()

  const email = document
    .getElementById('novo-aluno-email')
    .value
    .trim()
    .toLowerCase()

  const ativo = document
    .getElementById('novo-aluno-ativo')
    .checked

  if (!nome || !email) {
    alert('Preencha o nome e o e-mail do aluno.')
    return
  }

  const botao = event.submitter

  if (botao) {
    botao.disabled = true
    botao.textContent = 'Salvando...'
  }

  try {
    // ======================================================
    // 1. SALVAR O ALUNO NA TABELA ALUNOS
    // ======================================================

    const {
      data: aluno,
      error: alunoError
    } = await supabase
      .from('alunos')
      .insert({
        nome,
        email,
        ativo
      })
      .select()
      .single()

    if (alunoError) {
      console.error('Erro ao cadastrar aluno:', alunoError)

      if (alunoError.code === '23505') {
        alert(
          'Já existe um aluno cadastrado com este e-mail.'
        )
      } else {
        alert(
          'Não foi possível cadastrar o aluno.'
        )
      }

      return
    }

    console.log(
      'Aluno cadastrado com sucesso:',
      aluno
    )

    // ======================================================
    // 2. CRIAR O ACESSO NO SUPABASE AUTHENTICATION
    // ======================================================

    const {
      data: acesso,
      error: acessoError
    } = await supabase.functions.invoke(
      'criar-aluno',
      {
        body: {
          aluno_id: aluno.id
        }
      }
    )

    if (acessoError) {
      console.error(
        'Erro ao criar acesso do aluno:',
        acessoError
      )

      alert(
        'O aluno foi cadastrado, mas não foi possível criar o acesso de login.\n\n' +
        'O cadastro permanece salvo. Podemos tentar criar o acesso novamente.'
      )

      await mostrarAlunosProfessor()

      return
    }

    // ======================================================
    // 3. VERIFICAR RESPOSTA DA EDGE FUNCTION
    // ======================================================

    if (!acesso || !acesso.sucesso) {
      console.error(
        'Edge Function retornou erro:',
        acesso
      )

      alert(
        acesso?.erro ||
        'O aluno foi cadastrado, mas houve um problema ao criar o acesso.'
      )

      await mostrarAlunosProfessor()

      return
    }

    // ======================================================
    // 4. SUCESSO COMPLETO
    // ======================================================

    console.log(
      'Acesso criado com sucesso:',
      acesso
    )

    const senhaTemporaria =
      acesso.acesso?.senha_temporaria || ''

    if (senhaTemporaria) {
      alert(
        'Aluno cadastrado com sucesso! 🎉\n\n' +
        'E-mail: ' +
        email +
        '\n\n' +
        'Senha temporária: ' +
        senhaTemporaria +
        '\n\n' +
        'IMPORTANTE: anote essa senha e entregue ao aluno.'
      )
    } else {
      alert(
        'Aluno e acesso cadastrados com sucesso! 🎉'
      )
    }

    await mostrarAlunosProfessor()

  } catch (error) {
    console.error(
      'Erro inesperado ao cadastrar aluno:',
      error
    )

    alert(
      'Ocorreu um erro inesperado ao cadastrar o aluno.'
    )

  } finally {
    if (botao) {
      botao.disabled = false
      botao.textContent = 'Salvar aluno'
    }
  }
}

window.salvarNovoAluno =
  salvarNovoAluno

// ======================================================
// VOLTAR PARA DASHBOARD PROFESSOR
// ======================================================

async function mostrarAreaProfessorAtual() {
  if (!window.usuarioAtual) {
    console.error(
      'Usuário atual não encontrado.'
    )

    mostrarLogin()

    return
  }

  await mostrarAreaProfessor(
    window.usuarioAtual
  )
}

window.mostrarAreaProfessorAtual =
  mostrarAreaProfessorAtual

// ======================================================
// FICHA DO ALUNO
// ======================================================

async function mostrarFichaAluno(alunoId) {
  const area = document.getElementById(
    'professor-content'
  )

  if (!area) return

  area.innerHTML = `
    <div class="message info">
      Carregando ficha do aluno...
    </div>
  `

  const {
    data: aluno,
    error
  } = await supabase
    .from('alunos')
    .select('*')
    .eq('id', alunoId)
    .single()

  if (error || !aluno) {
    console.error(error)

    area.innerHTML = `
      <div class="message error">
        Não foi possível carregar a ficha do aluno.
      </div>
    `

    return
  }

  area.innerHTML = `
    <div class="section-header">

      <div>
        <h2>
          Ficha do aluno
        </h2>

        <p>
          ${escaparHtml(aluno.nome)}
        </p>
      </div>

      <button
        class="secondary-button"
        onclick="mostrarAlunosProfessor()"
      >
        ← Voltar
      </button>

    </div>

    <div class="profile-card">

      <div class="profile-header">

        <div class="student-avatar large">
          ${escaparHtml(
            aluno.nome
              ? aluno.nome.charAt(0).toUpperCase()
              : '?'
          )}
        </div>

        <div>

          <h2>
            ${escaparHtml(aluno.nome)}
          </h2>

          <p>
            ${escaparHtml(
              aluno.email || 'Sem e-mail'
            )}
          </p>

          <span class="badge">
            ${aluno.ativo ? 'Ativo' : 'Inativo'}
          </span>

        </div>

      </div>

      <div class="dashboard-grid">

        <button
          class="dashboard-card"
          onclick="mostrarTreinosProfessorAluno('${aluno.id}')"
        >
          <div class="dashboard-icon">
            🏋️
          </div>

          <strong>
            Treinos
          </strong>

          <small>
            Gerenciar treinos do aluno
          </small>
        </button>

        <button
          class="dashboard-card"
          onclick="mostrarProgressoProfessorAluno('${aluno.id}')"
        >
          <div class="dashboard-icon">
            📊
          </div>

          <strong>
            Progresso
          </strong>

          <small>
            Avaliações e evolução
          </small>
        </button>

        <button
          class="dashboard-card"
          onclick="mostrarFormularioEditarAluno('${aluno.id}')"
        >
          <div class="dashboard-icon">
            ✏️
          </div>

          <strong>
            Editar cadastro
          </strong>

          <small>
            Alterar dados do aluno
          </small>
        </button>

        <button
          class="dashboard-card"
          onclick="mostrarMensagemProfessor('Acesso do aluno')"
        >
          <div class="dashboard-icon">
            🔐
          </div>

          <strong>
            Acesso do aluno
          </strong>

          <small>
            Gerenciar acesso
          </small>
        </button>

      </div>

    </div>
  `
}

window.mostrarFichaAluno =
  mostrarFichaAluno

// ======================================================
// EDITAR ALUNO
// ======================================================

async function mostrarFormularioEditarAluno(alunoId) {
  const area = document.getElementById(
    'professor-content'
  )

  const {
    data: aluno,
    error
  } = await supabase
    .from('alunos')
    .select('*')
    .eq('id', alunoId)
    .single()

  if (error || !aluno) {
    area.innerHTML = `
      <div class="message error">
        Não foi possível carregar o aluno.
      </div>
    `

    return
  }

  area.innerHTML = `
    <div class="section-header">

      <div>
        <h2>
          Editar aluno
        </h2>

        <p>
          Atualize os dados do aluno.
        </p>
      </div>

      <button
        class="secondary-button"
        onclick="mostrarFichaAluno('${aluno.id}')"
      >
        ← Voltar
      </button>

    </div>

    <div class="form-card">

      <form id="editar-aluno-form">

        <div class="form-group">

          <label>
            Nome completo
          </label>

          <input
            id="editar-aluno-nome"
            type="text"
            value="${escaparHtml(aluno.nome)}"
            required
          >

        </div>

        <div class="form-group">

          <label>
            E-mail
          </label>

          <input
            id="editar-aluno-email"
            type="email"
            value="${escaparHtml(aluno.email || '')}"
          >

        </div>

        <div class="form-group">

          <label style="display:flex;align-items:center;gap:8px;">

            <input
              id="editar-aluno-ativo"
              type="checkbox"
              ${aluno.ativo ? 'checked' : ''}
            >

            Aluno ativo

          </label>

        </div>

        <div id="editar-aluno-message"></div>

        <br>

        <button
          type="submit"
          class="primary-button"
        >
          💾 Salvar alterações
        </button>

      </form>

    </div>
  `

  document
    .getElementById('editar-aluno-form')
    .addEventListener(
      'submit',
      async event => {

        event.preventDefault()

        const nome = document
          .getElementById('editar-aluno-nome')
          .value
          .trim()

        const email = document
          .getElementById('editar-aluno-email')
          .value
          .trim()

        const ativo = document
          .getElementById('editar-aluno-ativo')
          .checked

        const mensagem =
          document.getElementById(
            'editar-aluno-message'
          )

        const dados = {
          nome,
          ativo,
          email: email || null
        }

        const {
          error
        } = await supabase
          .from('alunos')
          .update(dados)
          .eq('id', alunoId)

        if (error) {
          console.error(error)

          mensagem.innerHTML = `
            <div class="message error">
              Não foi possível atualizar o aluno.
            </div>
          `

          return
        }

        mensagem.innerHTML = `
          <div class="message success">
            Aluno atualizado com sucesso! ✅
          </div>
        `

        setTimeout(() => {
          mostrarFichaAluno(alunoId)
        }, 700)
      }
    )
}

window.mostrarFormularioEditarAluno =
  mostrarFormularioEditarAluno

// ======================================================
// TREINOS DO PROFESSOR
// ======================================================

async function mostrarTreinosProfessorAluno(alunoId) {
  const area = document.getElementById(
    'professor-content'
  )

  area.innerHTML = `
    <div class="message info">
      Carregando treinos...
    </div>
  `

  const {
    data: aluno
  } = await supabase
    .from('alunos')
    .select('nome')
    .eq('id', alunoId)
    .single()

  const {
    data: treinos,
    error
  } = await supabase
    .from('treinos')
    .select('*')
    .eq('aluno_id', alunoId)
    .order('divisao', { ascending: true })
    .order('ordem', { ascending: true })

  if (error) {
    console.error(error)

    area.innerHTML = `
      <div class="message error">
        Erro ao carregar treinos.
      </div>
    `

    return
  }

  area.innerHTML = `
    <div class="section-header">

      <div>
        <h2>
          Treinos de ${escaparHtml(
            aluno?.nome || 'Aluno'
          )}
        </h2>

        <p>
          Adicione, edite ou exclua exercícios.
        </p>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">

        <button
          class="primary-button"
          onclick="mostrarFormularioTreinoProfessor('${alunoId}')"
        >
          + Adicionar exercício
        </button>

        <button
          class="secondary-button"
          onclick="mostrarFichaAluno('${alunoId}')"
        >
          ← Voltar
        </button>

      </div>

    </div>

    <div id="lista-treinos-professor"></div>
  `

  const lista = document.getElementById(
    'lista-treinos-professor'
  )

  if (!treinos || treinos.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">

        <h3>
          Nenhum exercício cadastrado
        </h3>

        <p>
          Clique em "Adicionar exercício" para montar o treino.
        </p>

      </div>
    `

    return
  }

  const grupos = {}

  treinos.forEach(treino => {
    if (!grupos[treino.divisao]) {
      grupos[treino.divisao] = []
    }

    grupos[treino.divisao].push(treino)
  })

  lista.innerHTML = Object.entries(grupos)
    .map(([divisao, exercicios]) => `
      <div class="workout-section">

        <div class="section-header">

          <div>
            <h3>
              Treino ${escaparHtml(divisao)}
            </h3>
          </div>

        </div>

        <div class="workout-list">

          ${exercicios.map(treino => `
            <div class="workout-card">

              <div class="workout-card-header">

                <strong>
                  ${escaparHtml(treino.exercicio)}
                </strong>

                <div class="action-buttons">

                  <button
                    class="secondary-button"
                    onclick="mostrarFormularioTreinoProfessor('${alunoId}', ${treino.id})"
                  >
                    Editar
                  </button>

                  <button
                    class="danger-button"
                    onclick="excluirTreinoProfessor(${treino.id}, '${alunoId}')"
                  >
                    Excluir
                  </button>

                </div>

              </div>

              <div class="workout-details">

                <span>
                  Séries:
                  <strong>
                    ${treino.series ?? '-'}
                  </strong>
                </span>

                <span>
                  Repetições:
                  <strong>
                    ${escaparHtml(
                      treino.repeticoes ?? '-'
                    )}
                  </strong>
                </span>

                ${
                  treino.video
                    ? `
                      <button
                        class="video-button"
                        onclick="abrirVideo('${escaparHtml(
                          treino.video
                        )}')"
                      >
                        ▶ Vídeo
                      </button>
                    `
                    : ''
                }

              </div>

            </div>
          `).join('')}

        </div>

      </div>
    `)
    .join('')
}

window.mostrarTreinosProfessorAluno =
  mostrarTreinosProfessorAluno

// ======================================================
// FORMULÁRIO DE TREINO
// ======================================================

async function mostrarFormularioTreinoProfessor(
  alunoId,
  treinoId = null
) {
  const area = document.getElementById(
    'professor-content'
  )

  let treino = null

  if (treinoId) {
    const {
      data,
      error
    } = await supabase
      .from('treinos')
      .select('*')
      .eq('id', treinoId)
      .single()

    if (error) {
      console.error(error)

      area.innerHTML = `
        <div class="message error">
          Erro ao carregar exercício.
        </div>
      `

      return
    }

    treino = data
  }

  area.innerHTML = `
    <div class="section-header">

      <div>
        <h2>
          ${treino
            ? 'Editar exercício'
            : 'Adicionar exercício'}
        </h2>
      </div>

      <button
        class="secondary-button"
        onclick="mostrarTreinosProfessorAluno('${alunoId}')"
      >
        ← Voltar
      </button>

    </div>

    <div class="form-card">

      <form id="treino-form">

        <div class="form-group">

          <label>
            Divisão
          </label>

          <input
            id="treino-divisao"
            type="text"
            placeholder="Ex.: A"
            value="${escaparHtml(
              treino?.divisao || ''
            )}"
            required
          >

        </div>

        <div class="form-group">

          <label>
            Exercício
          </label>

          <input
            id="treino-exercicio"
            type="text"
            placeholder="Nome do exercício"
            value="${escaparHtml(
              treino?.exercicio || ''
            )}"
            required
          >

        </div>

        <div class="form-group">

          <label>
            Séries
          </label>

          <input
            id="treino-series"
            type="number"
            min="1"
            value="${treino?.series ?? ''}"
          >

        </div>

        <div class="form-group">

          <label>
            Repetições
          </label>

          <input
            id="treino-repeticoes"
            type="text"
            placeholder="Ex.: 12"
            value="${escaparHtml(
              treino?.repeticoes || ''
            )}"
          >

        </div>

        <div class="form-group">

          <label>
            Vídeo do YouTube
          </label>

          <input
            id="treino-video"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value="${escaparHtml(
              treino?.video || ''
            )}"
          >

        </div>

        <div id="treino-message"></div>

        <br>

        <button
          type="submit"
          class="primary-button"
        >
          💾 Salvar exercício
        </button>

      </form>

    </div>
  `

  document
    .getElementById('treino-form')
    .addEventListener(
      'submit',
      event => salvarTreinoProfessor(
        event,
        alunoId,
        treinoId
      )
    )
}

window.mostrarFormularioTreinoProfessor =
  mostrarFormularioTreinoProfessor

// ======================================================
// SALVAR TREINO
// ======================================================

async function salvarTreinoProfessor(
  event,
  alunoId,
  treinoId
) {
  event.preventDefault()

  const mensagem =
    document.getElementById(
      'treino-message'
    )

  const divisao =
    document.getElementById(
      'treino-divisao'
    ).value.trim()

  const exercicio =
    document.getElementById(
      'treino-exercicio'
    ).value.trim()

  const seriesValue =
    document.getElementById(
      'treino-series'
    ).value

  const repeticoes =
    document.getElementById(
      'treino-repeticoes'
    ).value.trim()

  const video =
    document.getElementById(
      'treino-video'
    ).value.trim()

  if (!divisao || !exercicio) {
    mensagem.innerHTML = `
      <div class="message error">
        Divisão e exercício são obrigatórios.
      </div>
    `

    return
  }

  const dados = {
    aluno_id: alunoId,
    divisao,
    exercicio,
    series: seriesValue
      ? Number(seriesValue)
      : null,
    repeticoes: repeticoes || null,
    video: video || null
  }

  let resultado

  if (treinoId) {
    resultado = await supabase
      .from('treinos')
      .update(dados)
      .eq('id', treinoId)
  } else {
    resultado = await supabase
      .from('treinos')
      .insert(dados)
  }

  if (resultado.error) {
    console.error(resultado.error)

    mensagem.innerHTML = `
      <div class="message error">
        Não foi possível salvar o exercício.
      </div>
    `

    return
  }

  mensagem.innerHTML = `
    <div class="message success">
      Exercício salvo com sucesso! ✅
    </div>
  `

  setTimeout(() => {
    mostrarTreinosProfessorAluno(alunoId)
  }, 700)
}

window.salvarTreinoProfessor =
  salvarTreinoProfessor

// ======================================================
// EXCLUIR TREINO
// ======================================================

async function excluirTreinoProfessor(
  treinoId,
  alunoId
) {
  const confirmar = confirm(
    'Deseja realmente excluir este exercício?'
  )

  if (!confirmar) return

  const {
    error
  } = await supabase
    .from('treinos')
    .delete()
    .eq('id', treinoId)

  if (error) {
    console.error(error)

    alert(
      'Não foi possível excluir o exercício.'
    )

    return
  }

  await mostrarTreinosProfessorAluno(
    alunoId
  )
}

window.excluirTreinoProfessor =
  excluirTreinoProfessor

// ======================================================
// ÁREA DO ALUNO
// ======================================================

async function mostrarAreaAluno(user) {
  window.usuarioAtual = user

  const app = document.getElementById('app')

  const {
    data: aluno
  } = await supabase
    .from('alunos')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const {
    data: perfil
  } = await supabase
    .from('perfis')
    .select('nome')
    .eq('id', user.id)
    .maybeSingle()

  app.innerHTML = `
    <div class="app-container">

      ${criarTopbar(
        aluno?.nome ||
        perfil?.nome ||
        'Aluno'
      )}

      <main class="main-content">

        <div class="welcome-card">

          <div class="welcome-icon">
            🏋️
          </div>

          <div>

            <h2>
              Olá,
              ${escaparHtml(
                aluno?.nome ||
                perfil?.nome ||
                'Aluno'
              )}!
            </h2>

            <p>
              Confira seus treinos.
            </p>

          </div>

        </div>

        <section id="aluno-content">

          <div class="message info">
            Carregando seus treinos...
          </div>

        </section>

      </main>

    </div>
  `

  if (!aluno) {
    document.getElementById(
      'aluno-content'
    ).innerHTML = `
      <div class="message error">
        Cadastro de aluno não encontrado.
      </div>
    `

    return
  }

  await carregarTreinosAluno(
    aluno.id
  )
}

// ======================================================
// TREINOS DO ALUNO
// ======================================================

async function carregarTreinosAluno(
  alunoId,
  divisaoSelecionada = null
) {
  const area = document.getElementById(
    'aluno-content'
  )

  if (!area) return

  const {
    data: treinos,
    error
  } = await supabase
    .from('treinos')
    .select('*')
    .eq('aluno_id', alunoId)
    .order('divisao', {
      ascending: true
    })
    .order('ordem', {
      ascending: true
    })

  if (error) {
    console.error(error)

    area.innerHTML = `
      <div class="message error">
        Erro ao carregar seus treinos.
      </div>
    `

    return
  }

  window.treinosAlunoGrupos = {}

  ;(treinos || []).forEach(treino => {
    if (!window.treinosAlunoGrupos[treino.divisao]) {
      window.treinosAlunoGrupos[treino.divisao] = []
    }

    window.treinosAlunoGrupos[
      treino.divisao
    ].push(treino)
  })

  const divisoes = Object.keys(
    window.treinosAlunoGrupos
  )

  if (divisoes.length === 0) {
    area.innerHTML = `
      <div class="empty-state">

        <h3>
          Nenhum treino disponível
        </h3>

        <p>
          Seu professor ainda não cadastrou seus exercícios.
        </p>

      </div>
    `

    return
  }

  const divisaoInicial =
    divisaoSelecionada &&
    divisoes.includes(divisaoSelecionada)
      ? divisaoSelecionada
      : divisoes[0]

  window.divisaoTreinoAlunoAtual =
    divisaoInicial

  renderizarTreinoAluno(
    divisaoInicial
  )
}

window.carregarTreinosAluno =
  carregarTreinosAluno

// ======================================================
// SELECIONAR TREINO A / B
// ======================================================

function selecionarTreinoAluno(divisao) {
  window.divisaoTreinoAlunoAtual =
    divisao

  renderizarTreinoAluno(
    divisao
  )
}

window.selecionarTreinoAluno =
  selecionarTreinoAluno

// ======================================================
// RENDERIZAR TREINO DO ALUNO
// ======================================================

function renderizarTreinoAluno(divisao) {
  const area = document.getElementById(
    'aluno-content'
  )

  if (!area) return

  const grupo =
    window.treinosAlunoGrupos[
      divisao
    ] || []

  const divisoes =
    Object.keys(
      window.treinosAlunoGrupos
    )

  area.innerHTML = `
    <div class="section-header">

      <div>
        <h2>
          Meu treino
        </h2>

        <p>
          Selecione a divisão do treino.
        </p>
      </div>

    </div>

    <div class="workout-selector">

      <div class="workout-selector-title">
        Treinos disponíveis
      </div>

      <div class="workout-selector-buttons">

        ${divisoes.map(d => `
          <button
            class="workout-selector-button ${
              d === divisao
                ? 'active'
                : ''
            }"
            onclick="selecionarTreinoAluno('${escaparHtml(d)}')"
          >

            <span class="selector-letter">
              ${escaparHtml(d)}
            </span>

            <span>
              Treino ${escaparHtml(d)}
            </span>

          </button>
        `).join('')}

      </div>

    </div>

    <div class="workout-section">

      <div class="section-header">

        <div>
          <h2>
            Treino ${escaparHtml(divisao)}
          </h2>

          <p>
            ${grupo.length}
            exercício(s)
          </p>
        </div>

      </div>

      <div class="workout-list">

        ${grupo.map((treino, index) => `
          <div class="workout-card">

            <div class="workout-card-header">

              <div>

                <span
                  style="
                    display:block;
                    font-size:13px;
                    opacity:.7;
                    margin-bottom:5px;
                  "
                >
                  Exercício ${index + 1}
                </span>

                <strong>
                  ${escaparHtml(
                    treino.exercicio
                  )}
                </strong>

              </div>

            </div>

            <div class="workout-details">

              <span>
                Séries:
                <strong>
                  ${treino.series ?? '-'}
                </strong>
              </span>

              <span>
                Repetições:
                <strong>
                  ${escaparHtml(
                    treino.repeticoes ?? '-'
                  )}
                </strong>
              </span>

              ${
                treino.video
                  ? `
                    <button
                      class="video-button"
                      onclick="abrirVideo('${escaparHtml(
                        treino.video
                      )}')"
                    >
                      ▶ Ver demonstração
                    </button>
                  `
                  : ''
              }

            </div>

          </div>
        `).join('')}

      </div>

    </div>
  `
}

// ======================================================
// PROGRESSO DO ALUNO
// ======================================================

async function carregarProgressoAluno() {
  console.log(
    'Área de progresso do aluno ainda será desenvolvida.'
  )
}

window.carregarProgressoAluno =
  carregarProgressoAluno

// ======================================================
// PROGRESSO DO PROFESSOR
// ======================================================

async function mostrarProgressoProfessorAluno(
  alunoId
) {
  const area = document.getElementById(
    'professor-content'
  )

  if (!area) return

  area.innerHTML = `
    <div class="section-header">

      <div>
        <h2>
          Progresso do aluno
        </h2>

        <p>
          Avaliações e evolução.
        </p>
      </div>

      <button
        class="secondary-button"
        onclick="mostrarFichaAluno('${alunoId}')"
      >
        ← Voltar
      </button>

    </div>

    <div class="empty-state">

      <h3>
        Progresso
      </h3>

      <p>
        Esta área será desenvolvida na próxima etapa.
      </p>

    </div>
  `
}

window.mostrarProgressoProfessorAluno =
  mostrarProgressoProfessorAluno

// ======================================================
// INICIALIZAÇÃO
// ======================================================

async function inicializar() {
  const {
    data: {
      session
    }
  } = await supabase.auth.getSession()

  if (session?.user) {
    window.usuarioAtual =
      session.user

    await identificarUsuario(
      session.user
    )

    return
  }

  mostrarLogin()
}

supabase.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    if (
      event === 'SIGNED_OUT'
    ) {
      window.usuarioAtual = null
      mostrarLogin()
    }

  }
)

inicializar()