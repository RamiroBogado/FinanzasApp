KNOWLEDGE_BASE_CHUNKS = [
    """FinanzasApp es un gestor de finanzas personales con asistente de inteligencia artificial. 
    Permite registrar ingresos y gastos, organizarlos por categorías, definir presupuestos mensuales, 
    crear metas de ahorro y exportar reportes.""",
    """Registro de transacciones: la aplicación permite registrar un ingreso o gasto indicando monto, 
    categoría, fecha y una descripción opcional. Las transacciones se pueden buscar y filtrar por tipo, 
    categoría, rango de fechas y texto.""",
    """Categorías: cada transacción debe pertenecer a una categoría de ingreso o de gasto. 
    El usuario puede crear, editar y eliminar sus propias categorías personalizadas, cada una con un color.""",
    """Presupuestos: se puede definir un presupuesto mensual por categoría de gasto, con un umbral 
    de alerta configurable (80% por defecto). La aplicación muestra una barra de progreso y genera 
    alertas automáticas cuando el gasto alcanza el umbral configurado (amarillo) o supera el 
    presupuesto (rojo).""",
    """Metas de ahorro: el usuario puede crear metas con un monto objetivo y depositar dinero 
    periódicamente. La aplicación muestra el progreso en porcentaje.""",
    """Alertas automáticas: el sistema revisa los presupuestos y genera alertas cuando uno se excede 
    o llega al umbral de uso configurado por el usuario (80% por defecto). Las alertas se pueden 
    marcar como leídas.""",
    """Exportación: las transacciones filtradas se pueden exportar como archivo CSV para análisis 
    externo. También existe una generación de reportes PDF con las estadísticas.""",
    """Dashboard: la pantalla principal muestra el balance mensual, los gastos por categoría en un 
    gráfico de torta y la evolución mensual en un gráfico de barras. Se puede navegar entre meses.""",
    """Seguridad y autenticación: el sistema usa autenticación con JWT. Al registrarse o iniciar sesión 
    se obtiene un token que se envía en el header Authorization. Las contraseñas se guardan con bcrypt.""",
    """Stack tecnológico: el frontend está desarrollado con React, Vite y Tailwind CSS. 
    El backend es Node.js con Express y SQLite. El asistente funciona con Ollama (llama3.2) 
    y un pipeline RAG con LangChain que indexa los datos financieros del usuario para responder con contexto.""",
    """Consejo financiero: una buena regla para armar un presupuesto es destinar alrededor del 50% 
    de los ingresos a gastos fijos y necesidades, 30% a gastos personales y 20% al ahorro 
    (regla 50/30/20).""",
    """Consejo financiero: se recomienda tener un fondo de emergencia equivalente a 3 a 6 meses 
    de gastos fijos. Una meta de ahorro mensual realista suele estar entre el 10% y el 20% de los ingresos.""",
    """Consejo financiero: revisar los gastos por categoría de forma mensual ayuda a detectar fugas 
    de dinero. Si una categoría supera su presupuesto dos meses seguidos, conviene ajustar el hábito 
    o el límite.""",
    """Consejo financiero: registrar los gastos apenas se realizan, con fecha y descripción, 
    hace que los reportes sean más precisos y el asistente pueda dar recomendaciones útiles.""",
]