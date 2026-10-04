// ReservePro - Core Application Logic
// Handles Reservation CRUD, Payment Status Toggle, Multi-Day calculations, and Monthly/Weekly Financial Analytics

const STORAGE_KEY = 'reservepro_reservations_v5';

const initialReservations = [
  {
    id: 'res-101',
    customerName: 'Mariana Silva',
    customerPhone: '(11) 98765-4321',
    qtyJogos: 10,
    qtyCadeiras: 0,
    qtyMesas: 0,
    forroColors: { Vermelho: 10, 'Rosa Bebê': 5 },
    spaceName: '10x Jogos de Mesas | Forros: 10x Vermelho 🔴, 5x Rosa Bebê 🌸',
    startDate: '2026-10-02',
    endDate: '2026-10-05',
    dailyRate: 150,
    totalAmount: 450,
    status: 'paga',
    paymentMethod: 'Pix',
    notes: 'Reserva para festa de aniversário'
  },
  {
    id: 'res-102',
    customerName: 'Carlos Eduardo Santos',
    customerPhone: '(21) 99887-1122',
    qtyJogos: 5,
    qtyCadeiras: 10,
    qtyMesas: 2,
    forroColors: { Branco: 15, Roxo: 5 },
    spaceName: '5x Jogos de Mesas, 10x Cadeiras Avulsas, 2x Mesas Avulsas | Forros: 15x Branco ⚪, 5x Roxo 🟣',
    startDate: '2026-10-08',
    endDate: '2026-10-10',
    dailyRate: 180,
    totalAmount: 360,
    status: 'paga',
    paymentMethod: 'Cartão de Crédito',
    notes: 'Casamento com forros brancos e roxos'
  },
  {
    id: 'res-103',
    customerName: 'Fernanda Oliveira',
    customerPhone: '(31) 97654-3344',
    qtyJogos: 0,
    qtyCadeiras: 30,
    qtyMesas: 0,
    forroColors: { 'Rosa Bebê': 20 },
    spaceName: '30x Cadeiras Avulsas | Forros: 20x Rosa Bebê 🌸',
    startDate: '2026-10-14',
    endDate: '2026-10-16',
    dailyRate: 120,
    totalAmount: 240,
    status: 'nao_paga',
    paymentMethod: 'Pendente',
    notes: 'Chá de bebê'
  },
  {
    id: 'res-104',
    customerName: 'Roberto Mendes',
    customerPhone: '(41) 98877-6655',
    qtyJogos: 15,
    qtyCadeiras: 0,
    qtyMesas: 0,
    forroColors: { 'Verde Escuro': 10, Preto: 5 },
    spaceName: '15x Jogos de Mesas | Forros: 10x Verde Escuro 🟢, 5x Preto ⚫',
    startDate: '2026-10-20',
    endDate: '2026-10-23',
    dailyRate: 250,
    totalAmount: 750,
    status: 'nao_paga',
    paymentMethod: 'Pendente',
    notes: 'Evento corporativo'
  },
  {
    id: 'res-105',
    customerName: 'Aline & Lucas',
    customerPhone: '(11) 91234-5678',
    qtyJogos: 8,
    qtyCadeiras: 12,
    qtyMesas: 4,
    forroColors: { Roxo: 8, 'Azul Bebê': 6 },
    spaceName: '8x Jogos de Mesas, 12x Cadeiras Avulsas, 4x Mesas Avulsas | Forros: 8x Roxo 🟣, 6x Azul Bebê 🔵',
    startDate: '2026-10-28',
    endDate: '2026-10-30',
    dailyRate: 200,
    totalAmount: 400,
    status: 'paga',
    paymentMethod: 'Pix',
    notes: 'Aniversário infantil'
  }
];

class ReservationApp {
  constructor() {
    this.reservations = this.loadData();
    this.currentView = 'dashboard';
    this.selectedYear = 2026;
    this.selectedMonth = 9; // Outubro (0-indexed)
    this.editingId = null;

    this.monthlyChart = null;
    this.weeklyChart = null;

    this.init();
  }

  loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading stored data', e);
      }
    }
    this.saveData(initialReservations);
    return initialReservations;
  }

  saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data || this.reservations));
  }

  init() {
    this.bindEvents();
    this.setupDatePickers();
    this.renderAll();
  }

  bindEvents() {
    document.querySelectorAll('.nav-item button').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-view');
        this.switchView(targetView);
      });
    });

    document.getElementById('filter-month')?.addEventListener('change', (e) => {
      this.selectedMonth = parseInt(e.target.value);
      this.renderAll();
    });

    document.getElementById('filter-year')?.addEventListener('change', (e) => {
      this.selectedYear = parseInt(e.target.value);
      this.renderAll();
    });

    document.getElementById('btn-open-modal')?.addEventListener('click', () => {
      this.openModal();
    });

    document.getElementById('btn-close-modal')?.addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('btn-cancel-modal')?.addEventListener('click', () => {
      this.closeModal();
    });

    // Fullscreen toggle event
    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    document.addEventListener('fullscreenchange', () => {
      this.updateFullscreenButton();
    });

    // Mobile menu toggle event
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
      sidebar?.classList.toggle('active');
      overlay?.classList.toggle('active');
    });

    overlay?.addEventListener('click', () => {
      sidebar?.classList.remove('active');
      overlay?.classList.remove('active');
    });

    const form = document.getElementById('reservation-form');
    if (form) {
      ['startDate', 'endDate', 'totalAmount'].forEach(fieldId => {
        document.getElementById(fieldId)?.addEventListener('change', () => this.calculateFormTotals());
        document.getElementById(fieldId)?.addEventListener('input', () => this.calculateFormTotals());
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    document.querySelectorAll('.payment-radio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.payment-radio-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const radio = btn.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    document.getElementById('search-input')?.addEventListener('input', () => {
      this.renderReservationTable();
    });

    document.getElementById('filter-status')?.addEventListener('change', () => {
      this.renderReservationTable();
    });
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  updateFullscreenButton() {
    const btn = document.getElementById('btn-fullscreen');
    if (!btn) return;
    const isFS = !!document.fullscreenElement;
    btn.innerHTML = isFS 
      ? '<i class="fas fa-compress"></i> <span class="fullscreen-text">Sair da Tela Cheia</span>' 
      : '<i class="fas fa-expand"></i> <span class="fullscreen-text">Tela Cheia</span>';
  }

  setupDatePickers() {
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput && !startDateInput.value) startDateInput.value = today;
    if (endDateInput && !endDateInput.value) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      endDateInput.value = tomorrow.toISOString().split('T')[0];
    }
  }

  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.nav-item button').forEach(b => b.classList.remove('active'));
    document.querySelector(`.nav-item button[data-view="${viewName}"]`)?.classList.add('active');

    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(`view-${viewName}`)?.classList.add('active');

    // Close mobile sidebar on view change
    document.querySelector('.sidebar')?.classList.remove('active');
    document.getElementById('sidebar-overlay')?.classList.remove('active');

    if (viewName === 'calendar') {
      this.renderCalendar();
    }
  }

  calculateFormTotals() {
    const startVal = document.getElementById('startDate').value;
    const endVal = document.getElementById('endDate').value;
    const totalVal = parseFloat(document.getElementById('totalAmount').value) || 0;

    if (startVal && endVal) {
      const d1 = new Date(startVal);
      const d2 = new Date(endVal);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const daysSpan = document.getElementById('calc-days');
      const totalSpan = document.getElementById('calc-total');

      if (diffDays > 0) {
        if (daysSpan) daysSpan.textContent = `${diffDays} dia(s)`;
        if (totalSpan) totalSpan.textContent = `R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      } else {
        if (daysSpan) daysSpan.textContent = `Datas inválidas`;
        if (totalSpan) totalSpan.textContent = `R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }
    }
  }

  generateItemSummary(qtyJogos, qtyCadeiras, qtyMesas, forroColors) {
    const parts = [];
    if (qtyJogos > 0) parts.push(`${qtyJogos}x Jogos de Mesas`);
    if (qtyCadeiras > 0) parts.push(`${qtyCadeiras}x Cadeiras Avulsas`);
    if (qtyMesas > 0) parts.push(`${qtyMesas}x Mesas Avulsas`);

    const forroParts = [];
    const colorEmojis = {
      'Vermelho': '🔴', 'Branco': '⚪', 'Roxo': '🟣',
      'Preto': '⚫', 'Verde Escuro': '🟢', 'Azul Bebê': '🔵', 'Rosa Bebê': '🌸'
    };

    if (forroColors) {
      Object.entries(forroColors).forEach(([color, count]) => {
        if (count > 0) {
          const emoji = colorEmojis[color] || '';
          forroParts.push(`${count}x ${color} ${emoji}`);
        }
      });
    }

    if (forroParts.length > 0) {
      parts.push(`Forros: ${forroParts.join(', ')}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'Nenhum item selecionado';
  }

  openModal(reservation = null) {
    const modal = document.getElementById('reservation-modal');
    const form = document.getElementById('reservation-form');
    const modalTitle = document.getElementById('modal-title');

    form.reset();
    document.querySelectorAll('.payment-radio-btn').forEach(b => b.classList.remove('selected'));

    if (reservation) {
      this.editingId = reservation.id;
      modalTitle.textContent = 'Editar Reserva';
      document.getElementById('customerName').value = reservation.customerName;
      document.getElementById('customerPhone').value = reservation.customerPhone || '';
      
      document.getElementById('qtyJogos').value = reservation.qtyJogos || 0;
      document.getElementById('qtyCadeiras').value = reservation.qtyCadeiras || 0;
      document.getElementById('qtyMesas').value = reservation.qtyMesas || 0;

      const fc = reservation.forroColors || {};
      document.getElementById('qtyForroVermelho').value = fc['Vermelho'] || 0;
      document.getElementById('qtyForroBranco').value = fc['Branco'] || 0;
      document.getElementById('qtyForroRoxo').value = fc['Roxo'] || 0;
      document.getElementById('qtyForroPreto').value = fc['Preto'] || 0;
      document.getElementById('qtyForroVerde').value = fc['Verde Escuro'] || 0;
      document.getElementById('qtyForroAzul').value = fc['Azul Bebê'] || 0;
      document.getElementById('qtyForroRosa').value = fc['Rosa Bebê'] || 0;

      document.getElementById('startDate').value = reservation.startDate;
      document.getElementById('endDate').value = reservation.endDate;
      document.getElementById('totalAmount').value = reservation.totalAmount !== undefined ? reservation.totalAmount : (reservation.dailyRate || 0);
      document.getElementById('paymentMethod').value = reservation.paymentMethod || 'Pix';
      document.getElementById('notes').value = reservation.notes || '';

      const status = reservation.status;
      if (status === 'paga') {
        document.getElementById('radio-paid').checked = true;
        document.getElementById('radio-paid').closest('.payment-radio-btn').classList.add('selected');
      } else {
        document.getElementById('radio-unpaid').checked = true;
        document.getElementById('radio-unpaid').closest('.payment-radio-btn').classList.add('selected');
      }
    } else {
      this.editingId = null;
      modalTitle.textContent = 'Nova Reserva (Multi-dias)';
      this.setupDatePickers();
      
      ['qtyJogos', 'qtyCadeiras', 'qtyMesas', 'qtyForroVermelho', 'qtyForroBranco', 'qtyForroRoxo', 'qtyForroPreto', 'qtyForroVerde', 'qtyForroAzul', 'qtyForroRosa'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = 0;
      });

      document.getElementById('totalAmount').value = 350;
      document.getElementById('radio-paid').checked = true;
      document.getElementById('radio-paid').closest('.payment-radio-btn').classList.add('selected');
    }

    this.calculateFormTotals();
    modal.classList.add('active');
  }

  closeModal() {
    document.getElementById('reservation-modal').classList.remove('active');
  }

  handleFormSubmit() {
    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    
    const qtyJogos = parseInt(document.getElementById('qtyJogos').value) || 0;
    const qtyCadeiras = parseInt(document.getElementById('qtyCadeiras').value) || 0;
    const qtyMesas = parseInt(document.getElementById('qtyMesas').value) || 0;

    const forroColors = {
      'Vermelho': parseInt(document.getElementById('qtyForroVermelho').value) || 0,
      'Branco': parseInt(document.getElementById('qtyForroBranco').value) || 0,
      'Roxo': parseInt(document.getElementById('qtyForroRoxo').value) || 0,
      'Preto': parseInt(document.getElementById('qtyForroPreto').value) || 0,
      'Verde Escuro': parseInt(document.getElementById('qtyForroVerde').value) || 0,
      'Azul Bebê': parseInt(document.getElementById('qtyForroAzul').value) || 0,
      'Rosa Bebê': parseInt(document.getElementById('qtyForroRosa').value) || 0,
    };

    const spaceName = this.generateItemSummary(qtyJogos, qtyCadeiras, qtyMesas, forroColors);
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const totalAmount = parseFloat(document.getElementById('totalAmount').value) || 0;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const notes = document.getElementById('notes').value.trim();
    const status = document.querySelector('input[name="paymentStatus"]:checked').value;

    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      alert('A data de saída (Check-out) deve ser posterior à data de entrada (Check-in).');
      return;
    }

    if (this.editingId) {
      const idx = this.reservations.findIndex(r => r.id === this.editingId);
      if (idx !== -1) {
        this.reservations[idx] = {
          ...this.reservations[idx],
          customerName, customerPhone, qtyJogos, qtyCadeiras, qtyMesas, forroColors,
          spaceName, startDate, endDate, totalAmount, status, paymentMethod, notes
        };
        this.showToast('Reserva atualizada com sucesso!', 'success');
      }
    } else {
      const newRes = {
        id: 'res-' + Date.now(),
        customerName, customerPhone, qtyJogos, qtyCadeiras, qtyMesas, forroColors,
        spaceName, startDate, endDate, totalAmount, status, paymentMethod, notes
      };
      this.reservations.unshift(newRes);
      this.showToast('Nova reserva cadastrada com sucesso!', 'success');
    }

    this.saveData();
    this.closeModal();
    this.renderAll();
  }

  togglePaymentStatus(id) {
    const res = this.reservations.find(r => r.id === id);
    if (res) {
      res.status = res.status === 'paga' ? 'nao_paga' : 'paga';
      if (res.status === 'paga' && res.paymentMethod === 'Pendente') {
        res.paymentMethod = 'Pix';
      } else if (res.status === 'nao_paga') {
        res.paymentMethod = 'Pendente';
      }
      this.saveData();
      this.renderAll();
      this.showToast(`Status da reserva alterado para: ${res.status === 'paga' ? 'PAGA ✓' : 'NÃO PAGA ⏳'}`, res.status === 'paga' ? 'success' : 'warning');
    }
  }

  deleteReservation(id) {
    if (confirm('Tem certeza que deseja excluir esta reserva?')) {
      this.reservations = this.reservations.filter(r => r.id !== id);
      this.saveData();
      this.renderAll();
      this.showToast('Reserva excluída.', 'warning');
    }
  }

  deleteAllReservations() {
    if (this.reservations.length === 0) {
      this.showToast('Não há nenhuma reserva para apagar.', 'warning');
      return;
    }

    const firstConfirm = confirm(
      `⚠️ ATENÇÃO: TEM CERTEZA QUE DESEJA APAGAR TODAS AS RESERVAS?\n\n` +
      `Você está prestes a excluir permanentemente todas as ${this.reservations.length} reserva(s) salvas no sistema.\n` +
      `Esta ação NÃO poderá ser desfeita.`
    );

    if (!firstConfirm) return;

    const userInput = prompt(
      `🔒 CONFIRMAÇÃO DE CERTEZA:\n\n` +
      `Para confirmar a exclusão permanente de TODAS as reservas, digite a palavra APAGAR no campo abaixo:`
    );

    if (userInput && userInput.trim().toUpperCase() === 'APAGAR') {
      const count = this.reservations.length;
      this.reservations = [];
      this.saveData();
      this.renderAll();
      this.showToast(`Todas as ${count} reservas foram apagadas com sucesso!`, 'warning');
    } else if (userInput !== null) {
      alert('Texto de confirmação incorreto. Nenhuma reserva foi apagada.');
    }
  }

  isReservationInMonth(res, year, month) {
    const d = new Date(res.startDate);
    return d.getFullYear() === year && d.getMonth() === month;
  }

  getDaysDifference(start, end) {
    const d1 = new Date(start);
    const d2 = new Date(end);
    return Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));
  }

  renderAll() {
    this.renderKPIs();
    this.renderMonthlyChart();
    this.renderWeeklyChart();
    this.renderReservationTable();
    if (this.currentView === 'calendar') {
      this.renderCalendar();
    }
  }

  renderKPIs() {
    const monthReservations = this.reservations.filter(r => this.isReservationInMonth(r, this.selectedYear, this.selectedMonth));

    let totalBilled = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalNights = 0;

    monthReservations.forEach(r => {
      const val = r.totalAmount || 0;
      totalBilled += val;
      if (r.status === 'paga') {
        totalPaid += val;
      } else {
        totalUnpaid += val;
      }
      totalNights += this.getDaysDifference(r.startDate, r.endDate);
    });

    document.getElementById('kpi-total').textContent = `R$ ${totalBilled.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    document.getElementById('kpi-paid').textContent = `R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    document.getElementById('kpi-unpaid').textContent = `R$ ${totalUnpaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    document.getElementById('kpi-count').textContent = `${monthReservations.length} (${totalNights} diárias)`;
  }

  renderMonthlyChart() {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const paidData = new Array(12).fill(0);
    const unpaidData = new Array(12).fill(0);

    this.reservations.forEach(r => {
      const d = new Date(r.startDate);
      if (d.getFullYear() === this.selectedYear) {
        const m = d.getMonth();
        if (r.status === 'paga') {
          paidData[m] += r.totalAmount;
        } else {
          unpaidData[m] += r.totalAmount;
        }
      }
    });

    const container = document.getElementById('monthly-container');
    if (!container) return;

    if (typeof Chart !== 'undefined') {
      const canvas = document.getElementById('monthlyRevenueChart');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (this.monthlyChart) this.monthlyChart.destroy();
        this.monthlyChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: monthNames,
            datasets: [
              { label: 'Faturamento Pago (R$)', data: paidData, backgroundColor: '#10b981', borderRadius: 6 },
              { label: 'Pendente / Não Pago (R$)', data: unpaidData, backgroundColor: '#f59e0b', borderRadius: 6 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans', weight: '600' } } } },
            scales: {
              x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
              y: { ticks: { color: '#9ca3af', callback: v => 'R$ ' + v }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
          }
        });
        return;
      }
    }

    this.renderFallbackChart(container, monthNames, paidData, unpaidData);
  }

  renderWeeklyChart() {
    const weeksLabel = ['Semana 1 (1-7)', 'Semana 2 (8-14)', 'Semana 3 (15-21)', 'Semana 4 (22-28)', 'Semana 5 (29-31)'];
    const paidData = new Array(5).fill(0);
    const unpaidData = new Array(5).fill(0);

    const monthReservations = this.reservations.filter(r => this.isReservationInMonth(r, this.selectedYear, this.selectedMonth));

    monthReservations.forEach(r => {
      const d = new Date(r.startDate).getDate();
      let w = 0;
      if (d <= 7) w = 0;
      else if (d <= 14) w = 1;
      else if (d <= 21) w = 2;
      else if (d <= 28) w = 3;
      else w = 4;

      if (r.status === 'paga') {
        paidData[w] += r.totalAmount;
      } else {
        unpaidData[w] += r.totalAmount;
      }
    });

    const container = document.getElementById('weekly-container');
    if (!container) return;

    if (typeof Chart !== 'undefined') {
      const canvas = document.getElementById('weeklyRevenueChart');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (this.weeklyChart) this.weeklyChart.destroy();
        this.weeklyChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: weeksLabel,
            datasets: [
              { label: 'Pago na Semana', data: paidData, backgroundColor: '#3b82f6', borderRadius: 6 },
              { label: 'Não Pago na Semana', data: unpaidData, backgroundColor: '#ef4444', borderRadius: 6 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans', weight: '600' } } } },
            scales: {
              x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
              y: { ticks: { color: '#9ca3af', callback: v => 'R$ ' + v }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
          }
        });
        return;
      }
    }

    this.renderFallbackChart(container, weeksLabel, paidData, unpaidData);
  }

  renderFallbackChart(container, labels, paid, unpaid) {
    const maxVal = Math.max(...paid, ...unpaid, 1);
    container.innerHTML = `
      <div class="fallback-chart">
        ${labels.map((lbl, i) => {
          const hP = Math.round((paid[i] / maxVal) * 100);
          const hU = Math.round((unpaid[i] / maxVal) * 100);
          return `
            <div class="fallback-bar-group">
              <div class="fallback-bars-wrapper">
                <div class="fallback-bar paid" style="height: ${hP}%;" title="Pago: R$ ${paid[i]}"></div>
                <div class="fallback-bar unpaid" style="height: ${hU}%;" title="Não Pago: R$ ${unpaid[i]}"></div>
              </div>
              <div class="fallback-label">${lbl}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  formatItemSummaryHTML(r) {
    if (!r.qtyJogos && !r.qtyCadeiras && !r.qtyMesas && !r.forroColors) {
      return `<strong style="color: #f8fafc;">${r.spaceName || 'Item Reservado'}</strong>`;
    }

    const items = [];
    if (r.qtyJogos > 0) items.push(`<span class="badge-item primary">📦 <b>${r.qtyJogos}x</b> Jogos</span>`);
    if (r.qtyCadeiras > 0) items.push(`<span class="badge-item info">🪑 <b>${r.qtyCadeiras}x</b> Cadeiras</span>`);
    if (r.qtyMesas > 0) items.push(`<span class="badge-item success">🟫 <b>${r.qtyMesas}x</b> Mesas</span>`);

    const colorEmojis = {
      'Vermelho': '🔴', 'Branco': '⚪', 'Roxo': '🟣',
      'Preto': '⚫', 'Verde Escuro': '🟢', 'Azul Bebê': '🔵', 'Rosa Bebê': '🌸'
    };

    if (r.forroColors) {
      Object.entries(r.forroColors).forEach(([color, count]) => {
        if (count > 0) {
          const emoji = colorEmojis[color] || '🎨';
          items.push(`<span class="badge-item color">🎨 <b>${count}x</b> ${color} ${emoji}</span>`);
        }
      });
    }

    if (items.length === 0 && r.spaceName) {
      return `<strong style="color: #f8fafc;">${r.spaceName}</strong>`;
    }

    return `<div class="items-summary-wrapper">${items.join(' ')}</div>`;
  }

  renderReservationTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filter-status')?.value || 'all';

    const filtered = this.reservations.filter(r => {
      const matchSearch = r.customerName.toLowerCase().includes(searchTerm) || 
                          r.spaceName.toLowerCase().includes(searchTerm) ||
                          (r.notes && r.notes.toLowerCase().includes(searchTerm));
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            Nenhuma reserva encontrada.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(r => {
      const days = this.getDaysDifference(r.startDate, r.endDate);
      const isPaid = r.status === 'paga';
      const formattedTotal = r.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      
      const formatDateStr = (dateStr) => {
        const parts = dateStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      };

      return `
        <tr>
          <td>
            <strong style="color: white; font-size: 0.95rem;">${r.customerName}</strong><br>
            <small style="color: var(--text-muted);">${r.customerPhone || 'Sem telefone'}</small>
          </td>
          <td>
            ${this.formatItemSummaryHTML(r)}
          </td>
          <td>
            ${formatDateStr(r.startDate)} ➔ ${formatDateStr(r.endDate)}
            <span class="days-pill">${days} ${days === 1 ? 'dia' : 'dias'}</span>
          </td>
          <td style="font-weight: 700; color: white;">R$ ${formattedTotal}</td>
          <td>
            <small style="color: var(--text-muted);">${r.paymentMethod || 'Pendente'}</small>
          </td>
          <td>
            <button class="badge-status ${isPaid ? 'badge-paid' : 'badge-unpaid'}" onclick="app.togglePaymentStatus('${r.id}')" title="Clique para alternar status do pagamento">
              ${isPaid ? '✓ PAGA' : '⏳ NÃO PAGA'}
            </button>
          </td>
          <td>
            <div class="actions-cell">
              <button class="btn-icon" onclick="app.editReservation('${r.id}')" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-icon danger" onclick="app.deleteReservation('${r.id}')" title="Excluir">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  editReservation(id) {
    const res = this.reservations.find(r => r.id === id);
    if (res) {
      this.openModal(res);
    }
  }

  renderCalendar() {
    const monthYearTitle = document.getElementById('calendar-month-year');
    const grid = document.getElementById('calendar-days');
    if (!grid) return;

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    if (monthYearTitle) {
      monthYearTitle.textContent = `${monthNames[this.selectedMonth]} de ${this.selectedYear}`;
    }

    grid.innerHTML = '';

    const firstDayOfMonth = new Date(this.selectedYear, this.selectedMonth, 1);
    const lastDayOfMonth = new Date(this.selectedYear, this.selectedMonth + 1, 0);

    const startDayIndex = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    for (let i = 0; i < startDayIndex; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      grid.appendChild(cell);
    }

    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${this.selectedYear}-${String(this.selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell';
      if (today.getFullYear() === this.selectedYear && today.getMonth() === this.selectedMonth && today.getDate() === day) {
        cell.classList.add('today');
      }

      const num = document.createElement('div');
      num.className = 'day-number';
      num.textContent = day;
      cell.appendChild(num);

      const eventsContainer = document.createElement('div');
      eventsContainer.className = 'day-events';

      const matchingEvents = this.reservations.filter(r => {
        return dateStr >= r.startDate && dateStr <= r.endDate;
      });

      matchingEvents.forEach(ev => {
        const item = document.createElement('div');
        item.className = `calendar-event-item ${ev.status === 'paga' ? 'paid' : 'unpaid'}`;
        const formattedAmt = (ev.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        item.innerHTML = `<span>${ev.customerName.split(' ')[0]}</span> <small>R$ ${formattedAmt}</small>`;
        item.onclick = (e) => {
          e.stopPropagation();
          this.editReservation(ev.id);
        };
        eventsContainer.appendChild(item);
      });

      cell.appendChild(eventsContainer);
      grid.appendChild(cell);
    }
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new ReservationApp();
});
