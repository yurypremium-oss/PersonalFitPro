import './style.css'
import { supabase } from './lib/supabase.js'

const app = document.querySelector('#app')

/* =========================================================
   LOGIN
========================================================= */

function mostrarLogin() {
  app.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <h1>Personal Fit Pro</h1>
        <p class="subtitle">Área do aluno</p>

        <form id="login-form">

          <label for="email">
            E-mail
          </label>

          <input
            type="email"
            id="email"
            placeholder="Digite seu e-mail"
            required
          />

          <label for="password">
            Senha
          </label>

          <input
            type="password"
            id="password"
            placeholder="Digite sua senha"
            required
          />

          <button type="submit">
            Entrar
          </button>

          <p id="message"></p>

        </form>
      </div>
    </div>
  `

  const form = document.querySelector('#login-form')
  const message = document.querySelector('#message')

  form.addEventListener('submit', async (event) => {

    event.preventDefault()

    const email =
      document.querySelector('#email').value

    const password =
      document.querySelector('#password').value

    message.textContent = 'Entrando...'

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      })

    if (error) {

      console.error(error)

      message.textContent =
        '❌ E-mail ou senha incorretos.'

      return
    }

    await carregarDashboard(data.user)
  })
}


/* =========================================================
   CARREGAR DASHBOARD
========================================================= */

async function carregarDashboard(user) {

  const { data: aluno, error: alunoError } =
    await supabase
      .from('alunos')
      .select('id, nome, email')
      .eq('auth_user_id', user.id)
      .single()


  if (alunoError) {

    console.error(alunoError)

    app.innerHTML = `
      <div class="dashboard">

        <section class="pagina-placeholder">

          <div class="placeholder-icon">
            ⚠️
          </div>

          <h1>
            Erro
          </h1>

          <p>
            Cadastro do aluno não encontrado.
          </p>

        </section>

      </div>
    `

    return
  }


  mostrarDashboard(aluno)
}


/* =========================================================
   DASHBOARD
========================================================= */

function mostrarDashboard(aluno) {

  app.innerHTML = `
    <div class="dashboard">

      <header class="dashboard-header">

        <div>

          <h1>
            Personal Fit Pro
          </h1>

          <p>
            Olá,
            <strong>${aluno.nome}</strong>
            👋
          </p>

        </div>

        <button id="logout-button">
          Sair
        </button>

      </header>


      <main id="conteudo"></main>


      <nav class="bottom-menu">

        <button
          class="menu-item active"
          data-page="treinos"
        >
          <span>🏋️</span>
          <small>Treinos</small>
        </button>


        <button
          class="menu-item"
          data-page="progresso"
        >
          <span>📊</span>
          <small>Progresso</small>
        </button>


        <button
          class="menu-item"
          data-page="historico"
        >
          <span>📅</span>
          <small>Histórico</small>
        </button>


        <button
          class="menu-item"
          data-page="perfil"
        >
          <span>👤</span>
          <small>Perfil</small>
        </button>

      </nav>

    </div>
  `


  /* MENU INFERIOR */

  document
    .querySelectorAll('.menu-item')
    .forEach((button) => {

      button.addEventListener('click', async () => {

        document
          .querySelectorAll('.menu-item')
          .forEach((item) => {

            item.classList.remove('active')

          })


        button.classList.add('active')


        const page =
          button.dataset.page


        await abrirPagina(
          page,
          aluno
        )

      })

    })


  /* LOGOUT */

  document
    .querySelector('#logout-button')
    .addEventListener('click', async () => {

      await supabase.auth.signOut()

      mostrarLogin()

    })


  /* ABRIR TREINOS */

  abrirPagina(
    'treinos',
    aluno
  )
}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

async function abrirPagina(
  page,
  aluno
) {

  if (page === 'treinos') {

    await carregarTreinos(aluno)

    return
  }


  if (page === 'progresso') {

    await carregarProgresso(aluno)

    return
  }


  const conteudo =
    document.querySelector('#conteudo')


  /* HISTÓRICO */

  if (page === 'historico') {

    conteudo.innerHTML = `

      <section class="pagina-placeholder">

        <div class="placeholder-icon">
          📅
        </div>

        <h2>
          Histórico
        </h2>

        <p>
          Aqui ficará o histórico
          dos seus treinos realizados.
        </p>

        <span>
          Em desenvolvimento
        </span>

      </section>

    `

    return
  }


  /* PERFIL */

  if (page === 'perfil') {

    conteudo.innerHTML = `

      <section class="pagina-placeholder">

        <div class="placeholder-icon">
          👤
        </div>

        <h2>
          Meu Perfil
        </h2>

        <p>
          <strong>
            ${aluno.nome}
          </strong>
        </p>

        <p>
          ${
            aluno.email ||
            'E-mail não informado'
          }
        </p>

        <span>
          Em desenvolvimento
        </span>

      </section>

    `
  }
}


/* =========================================================
   PROGRESSO
========================================================= */

async function carregarProgresso(aluno) {

  const conteudo =
    document.querySelector('#conteudo')


  conteudo.innerHTML = `
    <div class="loading">
      Carregando seu progresso...
    </div>
  `


  const {
    data: progresso,
    error
  } =
    await supabase
      .from('progresso')
      .select(`
        id,
        data_avaliacao,
        peso,
        altura,
        cintura,
        braco,
        coxa,
        percentual_gordura,
        observacoes
      `)
      .eq(
        'aluno_id',
        aluno.id
      )
      .order(
        'data_avaliacao',
        {
          ascending: false
        }
      )


  if (error) {

    console.error(error)

    conteudo.innerHTML = `

      <section class="pagina-placeholder">

        <div class="placeholder-icon">
          ⚠️
        </div>

        <h2>
          Erro ao carregar progresso
        </h2>

        <p>
          ${error.message}
        </p>

      </section>

    `

    return
  }


  if (
    !progresso ||
    progresso.length === 0
  ) {

    conteudo.innerHTML = `

      <section class="pagina-placeholder">

        <div class="placeholder-icon">
          📊
        </div>

        <h2>
          Meu Progresso
        </h2>

        <p>
          Ainda não existem
          avaliações cadastradas.
        </p>

      </section>

    `

    return
  }


  const atual =
    progresso[0]


  const dataFormatada =
    new Date(
      atual.data_avaliacao +
      'T00:00:00'
    ).toLocaleDateString(
      'pt-BR'
    )


  conteudo.innerHTML = `

    <section class="progresso-page">

      <div class="page-title">

        <div>

          <h2>
            Meu Progresso
          </h2>

          <p>
            Última avaliação:
            ${dataFormatada}
          </p>

        </div>

        <div class="progress-icon">
          📊
        </div>

      </div>


      <div class="metricas-grid">

        <div class="metrica-card">
          <span>⚖️ Peso</span>
          <strong>
            ${atual.peso ?? '--'} kg
          </strong>
        </div>


        <div class="metrica-card">
          <span>📏 Altura</span>
          <strong>
            ${atual.altura ?? '--'} m
          </strong>
        </div>


        <div class="metrica-card">
          <span>📐 Cintura</span>
          <strong>
            ${atual.cintura ?? '--'} cm
          </strong>
        </div>


        <div class="metrica-card">
          <span>💪 Braço</span>
          <strong>
            ${atual.braco ?? '--'} cm
          </strong>
        </div>


        <div class="metrica-card">
          <span>🦵 Coxa</span>
          <strong>
            ${atual.coxa ?? '--'} cm
          </strong>
        </div>


        <div class="metrica-card">
          <span>🔥 Gordura</span>
          <strong>
            ${atual.percentual_gordura ?? '--'}%
          </strong>
        </div>

      </div>


      <div class="observacoes-card">

        <h3>
          📝 Observações
        </h3>

        <p>
          ${
            atual.observacoes ||
            'Nenhuma observação registrada.'
          }
        </p>

      </div>

    </section>

  `
}


/* =========================================================
   TREINOS
========================================================= */

async function carregarTreinos(aluno) {

  const conteudo =
    document.querySelector('#conteudo')


  conteudo.innerHTML = `
    <div class="loading">
      Carregando seus treinos...
    </div>
  `


  const {
    data: treinos,
    error
  } =
    await supabase
      .from('treinos')
      .select(`
        id,
        divisao,
        exercicio,
        series,
        repeticoes,
        video,
        ordem
      `)
      .eq(
        'aluno_id',
        aluno.id
      )
      .order('divisao')
      .order('ordem')


  if (error) {

    console.error(error)

    conteudo.innerHTML = `

      <div class="pagina-placeholder">

        <div class="placeholder-icon">
          ⚠️
        </div>

        <h2>
          Erro ao carregar treinos
        </h2>

        <p>
          ${error.message}
        </p>

      </div>

    `

    return
  }


  /* ORGANIZAR POR DIVISÃO */

  const treinosPorDivisao = {}


  treinos.forEach((treino) => {

    if (
      !treinosPorDivisao[
        treino.divisao
      ]
    ) {

      treinosPorDivisao[
        treino.divisao
      ] = []

    }


    treinosPorDivisao[
      treino.divisao
    ].push(treino)

  })


  const divisoes =
    Object.keys(
      treinosPorDivisao
    )


  if (
    divisoes.length === 0
  ) {

    conteudo.innerHTML = `

      <section class="pagina-placeholder">

        <div class="placeholder-icon">
          🏋️
        </div>

        <h2>
          Meus Treinos
        </h2>

        <p>
          Nenhum treino cadastrado.
        </p>

      </section>

    `

    return
  }


  /* BOTÕES A / B / C / D */

  let botoesTreinos = ''


  divisoes.forEach(
    (divisao, index) => {

      botoesTreinos += `

        <button
          type="button"
          class="treino-selector ${
            index === 0
              ? 'selected'
              : ''
          }"
          data-treino="${divisao}"
        >

          <span
            class="treino-selector-icon"
          >
            🏋️
          </span>

          <span>
            Treino ${divisao}
          </span>

        </button>

      `
    }
  )


  conteudo.innerHTML = `

    <section class="treinos-page">

      <div class="page-title">

        <div>

          <h2>
            Meus treinos
          </h2>

          <p>
            Escolha o treino
            que deseja visualizar
          </p>

        </div>

      </div>


      <div class="treinos-selector">

        ${botoesTreinos}

      </div>


      <div
        id="treino-selecionado"
      ></div>

    </section>

  `


  /* =======================================================
     MOSTRAR TREINO
  ======================================================= */

  function mostrarTreino(divisao) {

    const exercicios =
      treinosPorDivisao[
        divisao
      ]


    let html = `

      <section class="treino-card">

        <div class="treino-title">

          <div>

            <span>
              PROGRAMA
            </span>

            <h2>
              Treino ${divisao}
            </h2>

          </div>

          <div class="treino-count">

            ${exercicios.length}
            exercícios

          </div>

        </div>


        <div class="exercicios">

    `


    exercicios.forEach(
      (treino) => {

        html += `

          <div class="exercicio">

            <div class="exercise-number">
              ${treino.ordem}
            </div>


            <div class="exercicio-info">

              <h3>
                ${treino.exercicio}
              </h3>

              <p>
                ${treino.series}
                séries ×
                ${treino.repeticoes}
              </p>

            </div>


            ${
              treino.video
                ? `
                  <button
                    type="button"
                    class="video-button"
                    data-video="${encodeURIComponent(
                      treino.video
                    )}"
                    aria-label="Assistir vídeo"
                  >
                    ▶
                  </button>
                `
                : ''
            }

          </div>

        `
      }
    )


    html += `

        </div>

      </section>

    `


    const areaTreino =
      document.querySelector(
        '#treino-selecionado'
      )


    areaTreino.innerHTML = html


    /*
       BOTÃO ▶️

       Agora pegamos diretamente
       o endereço do vídeo armazenado
       no atributo data-video.
    */

    areaTreino
      .querySelectorAll(
        '.video-button'
      )
      .forEach((button) => {

        button.addEventListener(
          'click',
          () => {

            const video =
              decodeURIComponent(
                button.dataset.video
              )


            if (!video) {

              alert(
                'Vídeo não cadastrado para este exercício.'
              )

              return
            }


            console.log(
              'Abrindo vídeo:',
              video
            )


            window.open(
              video,
              '_blank'
            )

          }
        )

      })

  }


  /* =======================================================
     SELECIONAR TREINO
  ======================================================= */

  document
    .querySelectorAll(
      '.treino-selector'
    )
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          document
            .querySelectorAll(
              '.treino-selector'
            )
            .forEach((item) => {

              item.classList.remove(
                'selected'
              )

            })


          button.classList.add(
            'selected'
          )


          const divisao =
            button.dataset.treino


          mostrarTreino(
            divisao
          )

        }
      )

    })


  /* PRIMEIRO TREINO */

  mostrarTreino(
    divisoes[0]
  )
}


/* =========================================================
   INICIAR APLICAÇÃO
========================================================= */

async function iniciarApp() {

  const {
    data: {
      session
    }
  } =
    await supabase.auth.getSession()


  if (session) {

    await carregarDashboard(
      session.user
    )

  } else {

    mostrarLogin()

  }
}


iniciarApp()