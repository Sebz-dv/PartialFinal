import { useState, useEffect } from 'react'
import emailjs from 'emailjs-com'
import fullQuestions from './questions.json'

function getRandomQuestions(n) {
  const shuffled = [...fullQuestions].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, n)
}

export default function App() {
  const [step, setStep] = useState('form') // form, exam, result
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [jornada, setJornada] = useState('diurna')
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selected, setSelected] = useState(null)
  const [timeLeft, setTimeLeft] = useState(30 * 60) // 30 minutos
  const [showResult, setShowResult] = useState(false)

  // Guarda estado en localStorage para persistencia ante refresh
  useEffect(() => {
    const saved = localStorage.getItem('examState')
    if (saved) {
      const data = JSON.parse(saved)
      setStep(data.step)
      setName(data.name)
      setEmail(data.email)
      setJornada(data.jornada)
      setQuestions(data.questions)
      setCurrent(data.current)
      setAnswers(data.answers)
      setSelected(null)
      setTimeLeft(data.timeLeft)
      setShowResult(data.showResult)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'examState',
      JSON.stringify({
        step,
        name,
        email,
        jornada,
        questions,
        current,
        answers,
        timeLeft,
        showResult
      })
    )
  }, [step, name, email, jornada, questions, current, answers, timeLeft, showResult])

  // Temporizador
  useEffect(() => {
    if (step !== 'exam' || showResult) return
    if (timeLeft <= 0) {
      setShowResult(true)
      setStep('result')
      return
    }
    const interval = setInterval(() => {
      setTimeLeft(t => t - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [step, timeLeft, showResult])

  // Inicio examen: genera preguntas y cambia paso
  const startExam = () => {
    setQuestions(getRandomQuestions(20))
    setStep('exam')
    setTimeLeft(30 * 60)
  }

  // Manejo selección respuesta
  const handleSelect = option => setSelected(option)

  // Siguiente pregunta o terminar
  const handleNext = () => {
    if (selected === null) return
    const updatedAnswers = [...answers]
    updatedAnswers[current] = selected
    setAnswers(updatedAnswers)
    setSelected(null)
    if (current < questions.length - 1) {
      setCurrent(current + 1)
    } else {
      setShowResult(true)
      setStep('result')
    }
  }

  // Volver a pregunta anterior
  const handlePrevious = () => {
    if (current > 0) {
      // Guardar la respuesta actual antes de cambiar de pregunta
      if (selected !== null) {
        const updatedAnswers = [...answers];
        updatedAnswers[current] = selected;
        setAnswers(updatedAnswers);
      }
      
      // Retroceder a la pregunta anterior
      const prevQuestionIndex = current - 1;
      setCurrent(prevQuestionIndex);
      
      // Restaurar la selección previa si existe
      setSelected(answers[prevQuestionIndex] || null);
    }
  }

  // Calcular correctas y nota
  const correctCount = answers.reduce(
    (acc, a, i) => (a === questions[i]?.answer ? acc + 1 : acc),
    0
  )
  const score = ((correctCount / 20) * 5).toFixed(2)

  // Enviar email al finalizar
  useEffect(() => {
    if (step === 'result') {
      // Crear un formato HTML legible para las respuestas
      const createAnswersHTML = () => {
        let htmlContent = '';
        
        questions.forEach((q, index) => {
          const isCorrect = answers[index] === q.answer;
          const userAnswer = answers[index] || "No contestada";
          
          htmlContent += `
            <div style="margin-bottom: 20px; padding: 15px; background-color: ${isCorrect ? '#f0fff0' : '#fff0f0'}; border-radius: 8px; border-left: 5px solid ${isCorrect ? '#4CAF50' : '#F44336'};">
              <p style="font-weight: bold; margin-bottom: 8px; color: #333;">${index + 1}. ${q.question}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Respuesta correcta:</strong> ${q.answer}</p>
              <p style="margin: 5px 0; color: ${isCorrect ? '#4CAF50' : '#F44336'};"><strong>Tu respuesta:</strong> ${userAnswer}</p>
              <p style="font-weight: bold; color: ${isCorrect ? '#4CAF50' : '#F44336'};">${isCorrect ? '✓ Correcta' : '✗ Incorrecta'}</p>
            </div>
          `;
        });
        
        return htmlContent;
      };
      
      // Configurar EmailJS
      emailjs.init("aVyUPavS6v7EJWk_V");
      
      // Preparar datos para el correo
      const templateParams = {
        from_name: "frubiomo@uninpahu.edu.co",
        to_name: "obarragan@uninpahu.edu.co", // Cambiado según el requerimiento
        student_name: name,
        student_email: email,
        student_jornada: jornada,
        score: score,
        correct_count: correctCount,
        total_questions: questions.length,
        answers_detail: createAnswersHTML() // Enviar respuestas en formato HTML
      };
      
      emailjs
        .send(
          "service_fja2r5u",
          "template_nmjqtij",
          templateParams
        )
        .then(() => {
          console.log('Correo enviado exitosamente a obarragan@uninpahu.edu.co');
        })
        .catch(error => {
          console.error('Error al enviar correo:', error);
        });
    }
  }, [step])

  if (step === 'form') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-blue-200 p-6">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full shadow-xl transform transition-all hover:scale-105 duration-300">
          <h1 className="text-4xl font-extrabold mb-6 text-gray-800 text-center">
            🎓 Parcial Final
          </h1>
          <p className="mb-6 text-gray-700 text-center">
            Antes de iniciar, completa tus datos.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (
                name.trim() &&
                email.trim() &&
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
              ) {
                startExam()
              } else {
                alert('Por favor, ingresa un nombre y un correo institucional válido.')
              }
            }}
            className="space-y-4"
          >
            <input
              type="text"
              placeholder="Nombre completo"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
            <input
              type="email"
              placeholder="Correo institucional"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
            <select
              value={jornada}
              onChange={e => setJornada(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="diurna">Diurna</option>
              <option value="nocturna">Nocturna</option>
              <option value="sabatina">Sabatina</option>
            </select>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-full hover:from-blue-600 hover:to-indigo-700 transition-shadow shadow-md"
            >
              Iniciar examen
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (step === 'exam') {
    if (questions.length === 0)
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <p className="text-xl font-semibold text-gray-600">Cargando preguntas...</p>
        </div>
      )

    const question = questions[current]

    const formatTime = seconds => {
      const m = Math.floor(seconds / 60)
      const s = seconds % 60
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white shadow-2xl rounded-xl p-8 max-w-xl w-full transform transition-all duration-300">
          <div className="flex justify-between items-center mb-6 border-b pb-3">
            <h2 className="text-xl font-bold text-gray-800">
              Pregunta {current + 1} de 20
            </h2>
            <span className="text-sm font-mono bg-blue-100 text-blue-700 px-3 py-1 rounded-full shadow-inner">
              ⏱ {formatTime(timeLeft)}
            </span>
          </div>

          <p className="text-lg font-medium text-gray-800 mb-6 leading-relaxed">{question.question}</p>

          <div className="space-y-3 mb-6">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(option)}
                className={`w-full text-left border px-5 py-3 rounded-lg transition-all ${
                  selected === option
                    ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300'
                    : 'hover:bg-gray-50 border-gray-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex justify-between mt-4">
            {/* Botón Atrás */}
            <button
              onClick={handlePrevious}
              disabled={current === 0}
              className={`px-6 py-2 rounded-lg transition-all shadow-md ${
                current === 0
                  ? 'bg-gray-400 text-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700'
              }`}
            >
              Atrás
            </button>
            
            {/* Botón Siguiente/Finalizar */}
            <button
              onClick={handleNext}
              disabled={selected === null}
              className={`px-6 py-2 rounded-lg text-white transition-all shadow-md ${
                selected === null
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
              }`}
            >
              {current === 19 ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'result') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white shadow-2xl rounded-2xl p-8 max-w-lg w-full text-center transform transition-all hover:shadow-3xl duration-300">
          <h2 className="text-3xl font-bold mb-4 text-gray-800">✅ Resultado Final</h2>
          <p className="text-lg mb-2 text-gray-700">
            Respuestas correctas: <strong>{correctCount} / 20</strong>
          </p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            Nota final: <span className="text-4xl">{score}</span> / 5.00
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                localStorage.removeItem('examState')
                setStep('form')
                setName('')
                setEmail('')
                setJornada('diurna')
                setQuestions([])
                setAnswers([])
                setCurrent(0)
                setSelected(null)
                setShowResult(false)
                setTimeLeft(30 * 60)
              }}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-2 rounded-full hover:from-purple-600 hover:to-indigo-700 transition-all shadow-md"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
