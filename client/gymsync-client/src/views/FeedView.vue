<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()

const usuario = computed(() => store.state.auth.usuarioActual)
const esAdmin = computed(() => store.getters['auth/rolActual'] === 'ADMIN')

// Por ahora KPIs de ejemplo (después los conectamos a routines/progress)
const kpis = computed(() => {
  if (esAdmin.value) {
    return [
      { label: 'Usuarios totales', value: 24, desc: 'Incluye usuarios y coaches.' },
      { label: 'Rutinas creadas', value: 18, desc: 'Rutinas registradas en la plataforma.' },
      { label: 'Sesiones esta semana', value: 73, desc: 'Entrenos registrados por los usuarios.' },
      { label: 'Colaboraciones activas', value: 9, desc: 'Rutinas compartidas entre usuarios.' }
    ]
  }

  // Usuario normal / coach
  return [
    { label: 'Mis rutinas activas', value: 5, desc: 'Entre propias y colaborativas.' },
    { label: 'Entrenos este mes', value: 12, desc: 'Sesiones que registraste en tu progreso.' },
    { label: 'Minutos acumulados', value: 430, desc: 'Tiempo total entrenado este mes.' },
    { label: 'Rutinas colaborativas', value: 2, desc: 'Compartidas con otros usuarios.' }
  ]
})
</script>

<template>
  <section>
    <!-- Header de página -->
    <div class="card-dark mb-4">
      <span class="accent-pill">dashboard</span>
      <h1 class="mt-2 mb-1">
        Bienvenido, {{ usuario?.name }} 👋
      </h1>
      <p class="text-muted mb-0">
        {{ esAdmin
          ? 'Visión general de la actividad en GymSync. Desde acá podés monitorear usuarios y rutinas.'
          : 'Este es tu resumen rápido de rutinas, entrenos y progreso del mes. El detalle lo vas a encontrar en Mis rutinas y Estadísticas.'
        }}
      </p>
    </div>

    <!-- KPIs -->
    <div class="row g-3 mb-4">
      <div
        v-for="item in kpis"
        :key="item.label"
        class="col-md-3 col-6"
      >
        <div class="card-dark h-100">
          <p class="text-muted mb-1">{{ item.label }}</p>
          <h2 class="mb-0">{{ item.value }}</h2>
          <small class="text-muted">{{ item.desc }}</small>
        </div>
      </div>
    </div>

    <!-- Sugerencias de navegación -->
    <div class="row g-3">
      <div class="col-md-6">
        <div class="card-dark h-100">
          <h3 class="mb-2">Próximos pasos</h3>
          <ul class="text-muted mb-0">
            <li>Creá una nueva rutina desde <strong>Mis rutinas</strong>.</li>
            <li>Registrá tu entreno de hoy en <strong>Mi progreso</strong>.</li>
            <li>Mirá tus gráficos mensuales en la sección <strong>Estadísticas</strong>.</li>
          </ul>
        </div>
      </div>

      <div class="col-md-6" v-if="esAdmin">
        <div class="card-dark h-100">
          <h3 class="mb-2">Panel de administrador</h3>
          <p class="text-muted mb-2">
            Desde la sección <strong>Admin</strong> vas a poder ver y gestionar los perfiles de los usuarios,
            revisar sus rutinas y ajustar roles (USER / COACH / ADMIN).
          </p>
          <p class="text-muted mb-0">
            Más adelante acá podemos mostrar un gráfico con alta de usuarios por mes y
            las rutinas más utilizadas.
          </p>
        </div>
      </div>

      <div class="col-md-6" v-else>
        <div class="card-dark h-100">
          <h3 class="mb-2">Tips para aprovechar GymSync</h3>
          <ul class="text-muted mb-0">
            <li>Mantené actualizados tus datos en la sección <strong>Perfil</strong>.</li>
            <li>Probá crear al menos una rutina colaborativa con tu coach o amigo.</li>
            <li>Exportá tus datos a PDF/Excel desde <strong>Estadísticas</strong> para compartir con tu médico o entrenador.</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
