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
        videoId =
          urlObj.pathname.split('/shorts/')[1]
      }

      if (!videoId && urlObj.pathname.includes('/embed/')) {
        videoId =
          urlObj.pathname.split('/embed/')[1]
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

  const embedUrl =
    transformarYoutubeEmbed(url)

  if (!embedUrl) {

    alert(
      'Não foi possível abrir este vídeo.'
    )

    return
  }

  const modalExistente =
    document.getElementById('video-modal')

  if (modalExistente) {
    modalExistente.remove()
  }

  const modal =
    document.createElement('div')

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

  const modal =
    document.getElementById('video-modal')

  if (modal) {
    modal.remove()
  }
}


window.abrirVideo = abrirVideo
window.fecharVideo = fecharVideo


// ======================================================
// LOGIN
// ======================================================

async function realizarLogin(
  email,
  senha
) {

  const mensagem =
    document.getElementById('login-message')

  if (mensagem) {
    mensagem.innerHTML = ''
  }

  const {
    data,
    error
  } =
    await supabase.auth.signInWithPassword({
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

  window.usuarioAtual =
    data.user

  await identificarUsuario(
    data.user
  )
}


// ======================================================
// TELA DE LOGIN
// ======================================================

function mostrarLogin() {

  const app =
    document.getElementById('app')

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


  const form =
    document.getElementById('login-form')


  form.addEventListener(
    'submit',
    async event => {

      event.preventDefault()

      const email =
        document
          .getElementById('login-email')
          .value
          .trim()

      const senha =
        document
          .getElementById('login-password')
          .value

      await realizarLogin(
        email,
        senha
      )
    }
  )
}


// ======================================================
// IDENTIFICAR USUÁRIO
// ======================================================

async function identificarUsuario(user) {

  window.usuarioAtual = user

  const app =
    document.getElementById('app')

  const {
    data: perfil,
    error
  } =
    await supabase
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

  // CORREÇÃO IMPORTANTE
  window.usuarioAtual = user


  const app =
    document.getElementById('app')


  const {
    data: perfil
  } =
    await supabase
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

function mostrarMensagemProfessor(
  titulo
) {

  const area =
    document.getElementById(
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

  console.log(
    'Abrindo lista de alunos...'
  )


  const area =
    document.getElementById(
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

      <button
        class="secondary-button"
        onclick="mostrarAreaProfessorAtual()"
      >
        ← Voltar
      </button>

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
  } =
    await supabase
      .from('alunos')
      .select('*')
      .order('nome', {
        ascending: true
      })


  const lista =
    document.getElementById(
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


  lista.innerHTML =
    alunos
      .map(aluno => {

        const inicial =
          aluno.nome
            ? aluno.nome
                .charAt(0)
                .toUpperCase()
            : '?'


        return `

          <div
            class="student-row student-row-clickable"
            onclick="mostrarFichaAluno('${aluno.id}')"
          >

            <div class="student-avatar">

              ${escaparHtml(
                inicial
              )}

            </div>


            <div class="student-info">

              <strong>

                ${escaparHtml(
                  aluno.nome
                )}

              </strong>

              <span>

                ${escaparHtml(
                  aluno.email ||
                  'Sem e-mail'
                )}

              </span>

            </div>


            <div class="student-status">

              ${
                aluno.ativo
                  ? 'Ativo'
                  : 'Inativo'
              }

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

async function mostrarFichaAluno(
  alunoId
) {

  const area =
    document.getElementById(
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
  } =
    await supabase
      .from('alunos')
      .select('*')
      .eq('id', alunoId)
      .single()


  if (error) {

    console.error(error)

    area.innerHTML = `

      <div class="message error">

        Erro ao carregar aluno.

      </div>

    `

    return
  }


  const inicial =
    aluno.nome
      ? aluno.nome
          .charAt(0)
          .toUpperCase()
      : '?'


  area.innerHTML = `

    <div class="section-header">

      <div>

        <h2>
          Ficha do aluno
        </h2>

        <p>
          Gerenciamento individual
        </p>

      </div>

      <button
        class="secondary-button"
        onclick="mostrarAlunosProfessor()"
      >
        ← Alunos
      </button>

    </div>


    <div class="student-profile-card">

      <div class="student-profile-avatar">

        ${escaparHtml(
          inicial
        )}

      </div>


      <h3>

        ${escaparHtml(
          aluno.nome
        )}

      </h3>


      <p>

        ${escaparHtml(
          aluno.email ||
          'Sem e-mail'
        )}

      </p>


      <p>

        Status:

        <strong>

          ${
            aluno.ativo
              ? 'Ativo'
              : 'Inativo'
          }

        </strong>

      </p>

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
          Gerenciar treinos deste aluno
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
        onclick="mostrarMensagemProfessor('Editar cadastro')"
      >

        <div class="dashboard-icon">
          ✏️
        </div>

        <strong>
          Editar cadastro
        </strong>

        <small>
          Alterar informações do aluno
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


    <div id="aluno-content"></div>

  `
}


window.mostrarFichaAluno =
  mostrarFichaAluno


// ======================================================
// TREINOS DO PROFESSOR
// ======================================================

async function mostrarTreinosProfessorAluno(
  alunoId
) {

  const area =
    document.getElementById(
      'aluno-content'
    )


  if (!area) return


  area.innerHTML = `

    <div class="section-header">

      <div>

        <h3>
          Treinos
        </h3>

        <p>
          Gerencie os exercícios deste aluno.
        </p>

      </div>


      <button
        class="primary-button"
        onclick="mostrarFormularioTreinoProfessor('${alunoId}')"
      >
        + Novo exercício
      </button>

    </div>


    <div id="treinos-professor-list">

      <div class="message info">
        Carregando treinos...
      </div>

    </div>

  `


  const {
    data: treinos,
    error
  } =
    await supabase
      .from('treinos')
      .select('*')
      .eq('aluno_id', alunoId)
      .order('divisao', {
        ascending: true
      })
      .order('ordem', {
        ascending: true
      })


  const lista =
    document.getElementById(
      'treinos-professor-list'
    )


  if (error) {

    console.error(error)

    lista.innerHTML = `

      <div class="message error">

        Erro ao carregar treinos.

      </div>

    `

    return
  }


  if (!treinos || treinos.length === 0) {

    lista.innerHTML = `

      <div class="empty-state">

        <h3>
          Nenhum treino cadastrado
        </h3>

        <p>
          Clique em "Novo exercício" para começar.
        </p>

      </div>

    `

    return
  }


  const grupos = {}


  treinos.forEach(treino => {

    const divisao =
      treino.divisao ||
      'Treino'


    if (!grupos[divisao]) {
      grupos[divisao] = []
    }


    grupos[divisao].push(
      treino
    )
  })


  lista.innerHTML =
    Object.keys(grupos)
      .map(divisao => `

        <div class="workout-section">

          <div class="workout-section-header">

            <h3>
              Treino ${escaparHtml(
                divisao
              )}
            </h3>

            <span>

              ${
                grupos[divisao].length
              }

              ${
                grupos[divisao].length === 1
                  ? 'exercício'
                  : 'exercícios'
              }

            </span>

          </div>


          <div class="workout-list">

            ${grupos[divisao]
              .map(
                (treino, index) => `

                  <div class="workout-card">

                    <div class="workout-number">

                      ${index + 1}

                    </div>


                    <div class="workout-info">

                      <h4>

                        ${escaparHtml(
                          treino.exercicio
                        )}

                      </h4>


                      <div class="workout-details">

                        <span>

                          <strong>
                            Séries:
                          </strong>

                          ${escaparHtml(
                            treino.series
                          )}

                        </span>


                        <span>

                          <strong>
                            Repetições:
                          </strong>

                          ${escaparHtml(
                            treino.repeticoes
                          )}

                        </span>

                      </div>


                      <div class="workout-actions">

                        ${
                          treino.video
                            ? `

                              <button
                                class="secondary-button"
                                onclick="abrirVideo('${escaparHtml(treino.video)}')"
                              >
                                ▶ Assistir vídeo
                              </button>

                            `
                            : `

                              <span class="no-video">
                                Sem vídeo
                              </span>

                            `
                        }


                        <button
                          class="secondary-button"
                          onclick="mostrarFormularioTreinoProfessor('${alunoId}', '${treino.id}')"
                        >
                          ✏️ Editar
                        </button>


                        <button
                          class="secondary-button"
                          onclick="excluirTreinoProfessor('${treino.id}', '${alunoId}')"
                        >
                          🗑️ Excluir
                        </button>

                      </div>

                    </div>

                  </div>

                `
              )
              .join('')}

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

  const area =
    document.getElementById(
      'aluno-content'
    )


  let treino = null


  if (treinoId) {

    const {
      data,
      error
    } =
      await supabase
        .from('treinos')
        .select('*')
        .eq('id', treinoId)
        .eq('aluno_id', alunoId)
        .single()


    if (error) {

      console.error(error)

      alert(
        'Erro ao carregar exercício.'
      )

      return
    }


    treino = data
  }


  area.innerHTML = `

    <div class="section-header">

      <div>

        <h3>

          ${
            treino
              ? 'Editar exercício'
              : 'Novo exercício'
          }

        </h3>

        <p>
          Preencha os dados do exercício.
        </p>

      </div>


      <button
        class="secondary-button"
        onclick="mostrarTreinosProfessorAluno('${alunoId}')"
      >
        ← Voltar
      </button>

    </div>


    <form
      id="form-treino"
      class="form-card"
    >

      <label>

        Divisão

        <select
          id="treino-divisao"
          required
        >

          <option value="">
            Selecione
          </option>

          <option
            value="A"
            ${
              treino?.divisao === 'A'
                ? 'selected'
                : ''
            }
          >
            Treino A
          </option>

          <option
            value="B"
            ${
              treino?.divisao === 'B'
                ? 'selected'
                : ''
            }
          >
            Treino B
          </option>

          <option
            value="C"
            ${
              treino?.divisao === 'C'
                ? 'selected'
                : ''
            }
          >
            Treino C
          </option>

          <option
            value="D"
            ${
              treino?.divisao === 'D'
                ? 'selected'
                : ''
            }
          >
            Treino D
          </option>

        </select>

      </label>


      <label>

        Exercício

        <input
          id="treino-exercicio"
          type="text"
          placeholder="Ex.: Cadeira extensora"
          value="${escaparHtml(
            treino?.exercicio || ''
          )}"
          required
        >

      </label>


      <label>

        Séries

        <input
          id="treino-series"
          type="number"
          min="1"
          placeholder="Ex.: 3"
          value="${escaparHtml(
            treino?.series || ''
          )}"
          required
        >

      </label>


      <label>

        Repetições / Tempo

        <input
          id="treino-repeticoes"
          type="text"
          placeholder="Ex.: 12 ou 30 min"
          value="${escaparHtml(
            treino?.repeticoes || ''
          )}"
          required
        >

      </label>


      <label>

        Vídeo do YouTube

        <input
          id="treino-video"
          type="url"
          placeholder="https://www.youtube.com/..."
          value="${escaparHtml(
            treino?.video || ''
          )}"
        >

        <small>
          Opcional.
        </small>

      </label>


      <button
        type="submit"
        class="primary-button"
      >

        ${
          treino
            ? 'Salvar alterações'
            : 'Cadastrar exercício'
        }

      </button>

    </form>

  `


  document
    .getElementById('form-treino')
    .addEventListener(
      'submit',
      async event => {

        event.preventDefault()

        await salvarTreinoProfessor(
          alunoId,
          treinoId
        )
      }
    )
}


window.mostrarFormularioTreinoProfessor =
  mostrarFormularioTreinoProfessor


// ======================================================
// SALVAR TREINO
// ======================================================

async function salvarTreinoProfessor(
  alunoId,
  treinoId
) {

  const divisao =
    document
      .getElementById(
        'treino-divisao'
      )
      .value
      .trim()


  const exercicio =
    document
      .getElementById(
        'treino-exercicio'
      )
      .value
      .trim()


  const series =
    document
      .getElementById(
        'treino-series'
      )
      .value


  const repeticoes =
    document
      .getElementById(
        'treino-repeticoes'
      )
      .value
      .trim()


  const video =
    document
      .getElementById(
        'treino-video'
      )
      .value
      .trim()


  if (!divisao || !exercicio) {

    alert(
      'Preencha a divisão e o exercício.'
    )

    return
  }


  if (
    video &&
    !transformarYoutubeEmbed(video)
  ) {

    alert(
      'Informe um link válido do YouTube.'
    )

    return
  }


  if (treinoId) {

    const {
      error
    } =
      await supabase
        .from('treinos')
        .update({

          divisao,

          exercicio,

          series:
            series
              ? Number(series)
              : null,

          repeticoes,

          video:
            video || null

        })
        .eq(
          'id',
          treinoId
        )
        .eq(
          'aluno_id',
          alunoId
        )


    if (error) {

      console.error(error)

      alert(
        'Erro ao atualizar exercício.'
      )

      return
    }


    alert(
      'Exercício atualizado com sucesso!'
    )

  } else {

    const {
      data: existentes
    } =
      await supabase
        .from('treinos')
        .select('ordem')
        .eq(
          'aluno_id',
          alunoId
        )
        .eq(
          'divisao',
          divisao
        )
        .order(
          'ordem',
          {
            ascending: false
          }
        )
        .limit(1)


    const proximaOrdem =
      existentes?.length
        ? (
            existentes[0].ordem || 0
          ) + 1
        : 1


    const {
      error
    } =
      await supabase
        .from('treinos')
        .insert({

          aluno_id:
            alunoId,

          divisao,

          exercicio,

          series:
            series
              ? Number(series)
              : null,

          repeticoes,

          video:
            video || null,

          ordem:
            proximaOrdem

        })


    if (error) {

      console.error(error)

      alert(
        'Erro ao cadastrar exercício.'
      )

      return
    }


    alert(
      'Exercício cadastrado com sucesso!'
    )
  }


  await mostrarTreinosProfessorAluno(
    alunoId
  )
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

  const confirmar =
    confirm(
      'Deseja realmente excluir este exercício?'
    )


  if (!confirmar) {
    return
  }


  const {
    error
  } =
    await supabase
      .from('treinos')
      .delete()
      .eq(
        'id',
        treinoId
      )
      .eq(
        'aluno_id',
        alunoId
      )


  if (error) {

    console.error(error)

    alert(
      'Erro ao excluir exercício.'
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

async function mostrarAreaAluno(
  user
) {

  window.usuarioAtual = user


  const app =
    document.getElementById('app')


  const {
    data: perfil
  } =
    await supabase
      .from('perfis')
      .select('nome')
      .eq(
        'id',
        user.id
      )
      .single()


  app.innerHTML = `

    <div class="app-container">

      ${criarTopbar(
        perfil?.nome || 'Aluno'
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
                perfil?.nome || 'Aluno'
              )}!

            </h2>

            <p>
              Pronto para o seu treino de hoje?
            </p>

          </div>

        </div>


        <div class="dashboard-grid">

          <button
            class="dashboard-card"
            onclick="carregarTreinosAluno()"
          >

            <div class="dashboard-icon">
              🏋️
            </div>

            <strong>
              Meus treinos
            </strong>

            <small>
              Consulte seus exercícios
            </small>

          </button>


          <button
            class="dashboard-card"
            onclick="carregarProgressoAluno()"
          >

            <div class="dashboard-icon">
              📊
            </div>

            <strong>
              Meu progresso
            </strong>

            <small>
              Acompanhe sua evolução
            </small>

          </button>

        </div>


        <section id="aluno-area-content"></section>

      </main>

    </div>

  `
}


// ======================================================
// TREINOS DO ALUNO
// ======================================================

async function carregarTreinosAluno(
  divisaoSelecionada = null
) {

  const area =
    document.getElementById(
      'aluno-area-content'
    )


  if (!area) return


  area.innerHTML = `

    <div class="section-header">

      <div>

        <h2>
          Meus treinos
        </h2>

        <p>
          Escolha o treino que deseja visualizar.
        </p>

      </div>

    </div>


    <div id="seletor-treinos">

      <div class="message info">
        Carregando seus treinos...
      </div>

    </div>


    <div
      id="treino-aluno-conteudo"
      style="margin-top: 22px;"
    ></div>

  `


  const {
    data: treinos,
    error
  } =
    await supabase
      .from('treinos')
      .select('*')
      .order(
        'divisao',
        {
          ascending: true
        }
      )
      .order(
        'ordem',
        {
          ascending: true
        }
      )


  if (error) {

    console.error(error)

    area.innerHTML = `

      <div class="message error">

        Erro ao carregar seus treinos.

      </div>

    `

    return
  }


  if (!treinos || treinos.length === 0) {

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


  const grupos = {}


  treinos.forEach(treino => {

    const divisao =
      treino.divisao ||
      'Treino'


    if (!grupos[divisao]) {
      grupos[divisao] = []
    }


    grupos[divisao].push(
      treino
    )
  })


  const divisoes =
    Object.keys(grupos)


  const divisaoInicial =
    divisaoSelecionada &&
    grupos[divisaoSelecionada]
      ? divisaoSelecionada
      : divisoes[0]


  window.treinosAlunoGrupos =
    grupos

  window.divisaoTreinoAlunoAtual =
    divisaoInicial


  document
    .getElementById(
      'seletor-treinos'
    )
    .innerHTML = `

      <div class="workout-selector">

        <div class="workout-selector-title">

          Escolha seu treino

        </div>


        <div class="workout-selector-buttons">

          ${
            divisoes
              .map(divisao => `

                <button
                  class="
                    workout-selector-button
                    ${
                      divisao === divisaoInicial
                        ? 'active'
                        : ''
                    }
                  "
                  onclick="
                    selecionarTreinoAluno('${escaparHtml(divisao)}')
                  "
                >

                  <span class="selector-letter">

                    ${escaparHtml(
                      divisao
                    )}

                  </span>


                  <span>

                    Treino
                    ${escaparHtml(
                      divisao
                    )}

                  </span>

                </button>

              `)
              .join('')
          }

        </div>

      </div>

    `


  renderizarTreinoAluno(
    divisaoInicial
  )
}


window.carregarTreinosAluno =
  carregarTreinosAluno


// ======================================================
// SELECIONAR TREINO A/B/C/D
// ======================================================

function selecionarTreinoAluno(
  divisao
) {

  if (
    !window.treinosAlunoGrupos ||
    !window.treinosAlunoGrupos[divisao]
  ) {
    return
  }


  window.divisaoTreinoAlunoAtual =
    divisao


  document
    .querySelectorAll(
      '.workout-selector-button'
    )
    .forEach(botao => {

      botao.classList.remove(
        'active'
      )


      const letra =
        botao
          .querySelector(
            '.selector-letter'
          )


      if (
        letra &&
        letra.textContent.trim() ===
          divisao
      ) {

        botao.classList.add(
          'active'
        )
      }

    })


  renderizarTreinoAluno(
    divisao
  )
}


window.selecionarTreinoAluno =
  selecionarTreinoAluno


// ======================================================
// RENDERIZAR TREINO ESCOLHIDO
// ======================================================

function renderizarTreinoAluno(
  divisao
) {

  const area =
    document.getElementById(
      'treino-aluno-conteudo'
    )


  if (!area) return


  const treinos =
    window
      .treinosAlunoGrupos?.[divisao]


  if (!treinos) {
    return
  }


  area.innerHTML = `

    <div class="workout-section">

      <div class="workout-section-header">

        <h3>

          Treino
          ${escaparHtml(
            divisao
          )}

        </h3>


        <span>

          ${treinos.length}

          ${
            treinos.length === 1
              ? 'exercício'
              : 'exercícios'
          }

        </span>

      </div>


      <div class="workout-list">

        ${
          treinos
            .map(
              (treino, index) => `

                <div class="workout-card">

                  <div class="workout-number">

                    ${index + 1}

                  </div>


                  <div class="workout-info">

                    <h4>

                      ${escaparHtml(
                        treino.exercicio
                      )}

                    </h4>


                    <div class="workout-details">

                      <span>

                        <strong>
                          Séries:
                        </strong>

                        ${escaparHtml(
                          treino.series
                        )}

                      </span>


                      <span>

                        <strong>
                          Repetições:
                        </strong>

                        ${escaparHtml(
                          treino.repeticoes
                        )}

                      </span>

                    </div>


                    <div class="workout-actions">

                      ${
                        treino.video
                          ? `

                            <button
                              class="primary-button"
                              onclick="
                                abrirVideo('${escaparHtml(treino.video)}')
                              "
                            >

                              ▶ Ver demonstração

                            </button>

                          `
                          : `

                            <span class="no-video">

                              Vídeo não disponível

                            </span>

                          `
                      }

                    </div>

                  </div>

                </div>

              `
            )
            .join('')
        }

      </div>

    </div>

  `
}


// ======================================================
// PROGRESSO DO ALUNO
// ======================================================

async function carregarProgressoAluno() {

  const area =
    document.getElementById(
      'aluno-area-content'
    )


  if (!area) return


  area.innerHTML = `

    <div class="section-header">

      <div>

        <h2>
          Meu progresso
        </h2>

        <p>
          Acompanhe suas avaliações.
        </p>

      </div>

    </div>


    <div class="empty-state">

      <h3>
        Avaliações
      </h3>

      <p>
        A área de evolução será desenvolvida na próxima etapa.
      </p>

    </div>

  `
}


window.carregarProgressoAluno =
  carregarProgressoAluno


// ======================================================
// PROGRESSO DO PROFESSOR
// ======================================================

function mostrarProgressoProfessorAluno(
  alunoId
) {

  const area =
    document.getElementById(
      'aluno-content'
    )


  if (!area) return


  area.innerHTML = `

    <div class="section-header">

      <div>

        <h3>
          Progresso
        </h3>

        <p>
          Avaliações e evolução do aluno.
        </p>

      </div>

    </div>


    <div class="empty-state">

      <h3>
        Avaliações
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

  const app =
    document.getElementById('app')


  app.innerHTML = `

    <div class="loading-screen">

      <h2>
        Personal Fit Pro
      </h2>

      <p>
        Carregando...
      </p>

    </div>

  `


  const {
    data: {
      session
    }
  } =
    await supabase.auth.getSession()


  if (session?.user) {

    window.usuarioAtual =
      session.user

    await identificarUsuario(
      session.user
    )

  } else {

    mostrarLogin()
  }


  supabase.auth.onAuthStateChange(
    async (
      event,
      sessionAtual
    ) => {

      if (
        event === 'SIGNED_IN' &&
        sessionAtual?.user
      ) {

        window.usuarioAtual =
          sessionAtual.user

      }

    }
  )
}


// ======================================================
// INICIAR APLICAÇÃO
// ======================================================

inicializar()