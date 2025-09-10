const API_BASE_URL = 'http://localhost:3001';

let currentVehicles = [];
let currentEstadias = [];
let currentSection = 'dashboard';
let selectedVehicle = null;
let selectedEstadia = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('date-from').value = formatDateForInput(firstDay);
    document.getElementById('date-to').value = formatDateForInput(today);
    
    loadDashboardData();
    loadVehicles();
    
    setupVehicleForm();
    setupEstadiaForm();
    
    showSection('dashboard');
}

function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(sectionName).classList.add('active');
    document.getElementById(sectionName + '-btn').classList.add('active');
    
    currentSection = sectionName;
    
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'veiculos':
            loadVehicles();
            break;
        case 'estadias':
            loadEstadias();
            break;
        case 'relatorios':
            generateReport();
            break;
    }
}

function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('active');
}

async function loadDashboardData() {
    showLoading();
    
    try {
        const [vehicles, estadias] = await Promise.all([
            fetchVehicles(),
            fetchEstadias()
        ]);
        
        const today = new Date().toDateString();
        
        const activeEstadias = estadias.filter(e => !e.saida);
        const todayStays = estadias.filter(e => new Date(e.entrada).toDateString() === today);
        const todayRevenue = todayStays.reduce((sum, e) => sum + (e.valorTotal || 0), 0);
        const availableSpots = Math.max(0, 50 - activeEstadias.length);
        
        document.getElementById('total-veiculos').textContent = activeEstadias.length;
        document.getElementById('estadias-hoje').textContent = todayStays.length;
        document.getElementById('faturamento-hoje').textContent = formatCurrency(todayRevenue);
        document.getElementById('vagas-disponiveis').textContent = availableSpots;
        
        loadRecentActivities(estadias.slice(-5).reverse());
        
    } catch (error) {
        showToast('Erro ao carregar dados do dashboard', 'error');
        console.error('Erro:', error);
    } finally {
        hideLoading();
    }
}

function loadRecentActivities(recentEstadias) {
    const recentList = document.getElementById('recent-list');
    
    if (recentEstadias.length === 0) {
        recentList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Nenhuma atividade recente</p>';
        return;
    }
    
    recentList.innerHTML = recentEstadias.map(estadia => `
        <div class="activity-item">
            <div class="activity-info">
                <h4>${estadia.placa} - Entrada</h4>
                <p>Valor/Hora: ${formatCurrency(estadia.valorHora || 0)}</p>
            </div>
            <div class="activity-time">
                ${formatDateTime(estadia.entrada)}
            </div>
        </div>
    `).join('');
}

async function loadVehicles() {
    showLoading();
    
    try {
        const vehicles = await fetchVehicles();
        currentVehicles = vehicles;
        displayVehicles(vehicles);
    } catch (error) {
        showToast('Erro ao carregar veículos', 'error');
        console.error('Erro:', error);
    } finally {
        hideLoading();
    }
}

async function loadEstadias() {
    showLoading();
    
    try {
        const estadias = await fetchEstadias();
        currentEstadias = estadias;
        displayEstadias(estadias);
    } catch (error) {
        showToast('Erro ao carregar estadias', 'error');
        console.error('Erro:', error);
    } finally {
        hideLoading();
    }
}

async function fetchVehicles() {
    const response = await fetch(`${API_BASE_URL}/veiculos`);
    if (!response.ok) {
        throw new Error('Erro ao buscar veículos');
    }
    return await response.json();
}

async function fetchEstadias() {
    const response = await fetch(`${API_BASE_URL}/estadias`);
    if (!response.ok) {
        throw new Error('Erro ao buscar estadias');
    }
    return await response.json();
}

function displayVehicles(vehicles) {
    const vehiclesGrid = document.getElementById('vehicles-grid');
    
    if (vehicles.length === 0) {
        vehiclesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666;">
                <i class="fas fa-car" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <h3>Nenhum veículo encontrado</h3>
                <p>Adicione um novo veículo para começar</p>
            </div>
        `;
        return;
    }
    
    vehiclesGrid.innerHTML = vehicles.map(vehicle => {
        return `
            <div class="vehicle-card">
                <div class="vehicle-header">
                    <div class="vehicle-plate">${vehicle.placa}</div>
                    <div class="vehicle-type">${vehicle.tipo}</div>
                </div>
                <div class="vehicle-body">
                    <div class="vehicle-info">
                        <div class="info-item">
                            <div class="info-label">Proprietário</div>
                            <div class="info-value">${vehicle.proprietario}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Telefone</div>
                            <div class="info-value">${vehicle.telefone}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Veículo</div>
                            <div class="info-value">${vehicle.marca} ${vehicle.modelo}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Cor/Ano</div>
                            <div class="info-value">${vehicle.cor} (${vehicle.ano})</div>
                        </div>
                    </div>
                    <div class="vehicle-actions">
                        <button class="btn-primary btn-small" onclick="editVehicle('${vehicle.placa}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function displayEstadias(estadias) {
    const estadiasGrid = document.getElementById('estadias-grid');
    
    if (estadias.length === 0) {
        estadiasGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666;">
                <i class="fas fa-clock" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <h3>Nenhuma estadia encontrada</h3>
                <p>Adicione uma nova estadia para começar</p>
            </div>
        `;
        return;
    }
    
    estadiasGrid.innerHTML = estadias.map(estadia => {
        const isActive = !estadia.saida;
        const statusClass = isActive ? 'status-active' : 'status-finished';
        const statusText = isActive ? 'Ativo' : 'Finalizado';
        const total = estadia.valorTotal || 'Calculando...';
        
        return `
            <div class="vehicle-card">
                <div class="vehicle-header">
                    <div class="vehicle-plate">${estadia.placa}</div>
                    <div class="vehicle-type">${formatCurrency(estadia.valorHora || 0)}/h</div>
                </div>
                <div class="vehicle-body">
                    <div class="vehicle-info">
                        <div class="info-item">
                            <div class="info-label">Entrada</div>
                            <div class="info-value">${formatDateTime(estadia.entrada)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Saída</div>
                            <div class="info-value">${estadia.saida ? formatDateTime(estadia.saida) : 'Em andamento'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Duração</div>
                            <div class="info-value">${calculateDuration(estadia.entrada, estadia.saida)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Total</div>
                            <div class="info-value">${typeof total === 'number' ? formatCurrency(total) : total}</div>
                        </div>
                    </div>
                    <div class="vehicle-status">
                        <div class="status-badge ${statusClass}">${statusText}</div>
                    </div>
                    <div class="vehicle-actions">
                        <button class="btn-secondary btn-small" onclick="showEstadiaDetails(${estadia.id})">
                            <i class="fas fa-info-circle"></i> Detalhes
                        </button>
                        <button class="btn-primary btn-small" onclick="editEstadia(${estadia.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        ${isActive ? `<button class="btn-danger btn-small" onclick="finalizarEstadia(${estadia.id})">
                            <i class="fas fa-sign-out-alt"></i> Finalizar
                        </button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterVehicles() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const typeFilter = document.getElementById('type-filter').value;
    
    let filteredVehicles = currentVehicles;
    
    if (searchTerm) {
        filteredVehicles = filteredVehicles.filter(vehicle => 
            vehicle.placa.toLowerCase().includes(searchTerm) ||
            vehicle.proprietario.toLowerCase().includes(searchTerm) ||
            vehicle.modelo.toLowerCase().includes(searchTerm) ||
            vehicle.marca.toLowerCase().includes(searchTerm)
        );
    }
    
    if (typeFilter) {
        filteredVehicles = filteredVehicles.filter(vehicle => 
            vehicle.tipo === typeFilter
        );
    }
    
    displayVehicles(filteredVehicles);
}

function filterEstadias() {
    const searchTerm = document.getElementById('search-estadias').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    
    let filteredEstadias = currentEstadias;
    
    if (searchTerm) {
        filteredEstadias = filteredEstadias.filter(estadia => 
            estadia.placa.toLowerCase().includes(searchTerm)
        );
    }
    
    if (statusFilter) {
        if (statusFilter === 'ativo') {
            filteredEstadias = filteredEstadias.filter(estadia => !estadia.saida);
        } else if (statusFilter === 'finalizado') {
            filteredEstadias = filteredEstadias.filter(estadia => estadia.saida);
        }
    }
    
    displayEstadias(filteredEstadias);
}

function setupVehicleForm() {
    const form = document.getElementById('vehicle-form');
    form.addEventListener('submit', handleVehicleSubmit);
}

function setupEstadiaForm() {
    const form = document.getElementById('estadia-form');
    if (form) {
        form.addEventListener('submit', handleEstadiaSubmit);
    }
}

async function handleVehicleSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const placaOriginal = formData.get('placa-original');
    const placaValue = formData.get('placa');
    
    if (!placaValue) {
        showToast('Placa é obrigatória', 'error');
        return;
    }
    
    const vehicleData = {
        placa: placaValue.toUpperCase(),
        tipo: formData.get('tipo'),
        proprietario: formData.get('proprietario'),
        modelo: formData.get('modelo'),
        marca: formData.get('marca'),
        cor: formData.get('cor'),
        ano: parseInt(formData.get('ano')),
        telefone: formData.get('telefone')
    };
    
    let url = `${API_BASE_URL}/veiculos`;
    let method = 'POST';
    let successMessage = 'Veículo adicionado com sucesso!';
    let errorMessage = 'Erro ao adicionar veículo';
    
    if (placaOriginal) {
        url = `${API_BASE_URL}/veiculos/${placaOriginal}`;
        method = 'PATCH';
        successMessage = 'Veículo atualizado com sucesso!';
        errorMessage = 'Erro ao atualizar veículo';
    }
    
    try {
        showLoading();
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vehicleData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || errorMessage);
        }
        
        const result = await response.json();
        
        showToast(successMessage, 'success');
        closeModal('add-vehicle');
        event.target.reset();
        document.getElementById('placa').disabled = false;
        document.getElementById('placa-original').value = '';
        
        if (currentSection === 'veiculos') {
            loadVehicles();
        }
        if (currentSection === 'dashboard') {
            loadDashboardData();
        }
        
    } catch (error) {
        showToast(error.message, 'error');
        console.error('Erro:', error);
    } finally {
        hideLoading();
    }
}

async function handleEstadiaSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const estadiaId = formData.get('estadia-id');
    
    const estadiaData = {
        placa: formData.get('placa'),
        valorHora: parseFloat(formData.get('valorHora')),
        entrada: formData.get('entrada'),
        saida: formData.get('saida') || null
    };
    
    let url = `${API_BASE_URL}/estadias`;
    let method = 'POST';
    let successMessage = 'Estadia criada com sucesso!';
    let errorMessage = 'Erro ao criar estadia';
    
    if (estadiaId) {
        url = `${API_BASE_URL}/estadias/${estadiaId}`;
        method = 'PATCH';
        successMessage = 'Estadia atualizada com sucesso!';
        errorMessage = 'Erro ao atualizar estadia';
    }
    
    try {
        showLoading();
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(estadiaData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || errorMessage);
        }
        
        const result = await response.json();
        
        showToast(successMessage, 'success');
        closeModal('add-estadia');
        event.target.reset();
        
        if (currentSection === 'estadias') {
            loadEstadias();
        }
        if (currentSection === 'dashboard') {
            loadDashboardData();
        }
        
    } catch (error) {
        showToast(error.message, 'error');
        console.error('Erro:', error);
    } finally {
        hideLoading();
    }
}

function openVehicleModal(vehicle = null) {
    const form = document.getElementById('vehicle-form');
    form.reset();
    
    document.getElementById('placa').readOnly = false; 
    document.getElementById('placa-original').value = '';

    if (vehicle) {
        document.getElementById('modal-title-vehicle').innerHTML = '<i class="fas fa-car"></i> Editar Veículo';
        document.getElementById('placa').value = vehicle.placa;
        
        document.getElementById('placa').readOnly = true; 
        
        document.getElementById('placa-original').value = vehicle.placa;
        document.getElementById('tipo').value = vehicle.tipo;
        document.getElementById('proprietario').value = vehicle.proprietario;
        document.getElementById('telefone').value = vehicle.telefone;
        document.getElementById('marca').value = vehicle.marca;
        document.getElementById('modelo').value = vehicle.modelo;
        document.getElementById('cor').value = vehicle.cor;
        document.getElementById('ano').value = vehicle.ano;
    } else {
        document.getElementById('modal-title-vehicle').innerHTML = '<i class="fas fa-car"></i> Cadastro de Veículo';
        document.getElementById('placa').readOnly = false; 
    }
    openModal('add-vehicle');
}

async function openEstadiaModal(estadia = null) {
    const form = document.getElementById('estadia-form');
    form.reset();
    
    try {
        const vehicles = await fetchVehicles();
        const placaSelect = document.getElementById('estadia-placa');
        placaSelect.innerHTML = '<option value="">Selecione um veículo</option>';
        vehicles.forEach(vehicle => {
            placaSelect.innerHTML += `<option value="${vehicle.placa}">${vehicle.placa} - ${vehicle.proprietario}</option>`;
        });
    } catch (error) {
        console.error('Erro ao carregar veículos:', error);
    }
    
    if (estadia) {
        document.getElementById('modal-title-estadia').innerHTML = '<i class="fas fa-clock"></i> Editar Estadia';
        document.getElementById('estadia-id').value = estadia.id;
        document.getElementById('estadia-placa').value = estadia.placa;
        document.getElementById('valor-hora').value = estadia.valorHora;
        document.getElementById('data-entrada').value = formatDateTimeForInput(estadia.entrada);
        if (estadia.saida) {
            document.getElementById('data-saida').value = formatDateTimeForInput(estadia.saida);
        }
    } else {
        document.getElementById('modal-title-estadia').innerHTML = '<i class="fas fa-clock"></i> Nova Estadia';
        document.getElementById('estadia-id').value = '';
        const now = new Date();
        document.getElementById('data-entrada').value = formatDateTimeForInput(now);
    }
    openModal('add-estadia');
}

async function editVehicle(placa) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/veiculos/${placa}`);
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do veículo para edição');
        }
        const vehicle = await response.json();
        openVehicleModal(vehicle);
    } catch (error) {
        showToast(error.message, 'error');
        console.error('Erro ao editar veículo:', error);
    } finally {
        hideLoading();
    }
}

async function editEstadia(id) {
    try {
        showLoading();
        const estadia = currentEstadias.find(e => e.id === id);
        if (!estadia) {
            throw new Error('Estadia não encontrada');
        }
        openEstadiaModal(estadia);
    } catch (error) {
        showToast(error.message, 'error');
        console.error('Erro ao editar estadia:', error);
    } finally {
        hideLoading();
    }
}

async function showEstadiaDetails(id) {
    try {
        showLoading();
        
        const estadia = currentEstadias.find(e => e.id === id);
        if (!estadia) {
            throw new Error('Estadia não encontrada');
        }
        
        selectedEstadia = estadia;
        
        const detailsContent = document.getElementById('estadia-details-content');
        const isActive = !estadia.saida;
        
        detailsContent.innerHTML = `
            <div class="detail-grid">
                <div class="detail-section">
                    <h4><i class="fas fa-car"></i> Informações da Estadia</h4>
                    <div class="detail-item">
                        <span class="detail-label">Placa:</span>
                        <span class="detail-value">${estadia.placa}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Valor/Hora:</span>
                        <span class="detail-value">${formatCurrency(estadia.valorHora || 0)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Entrada:</span>
                        <span class="detail-value">${formatDateTime(estadia.entrada)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Saída:</span>
                        <span class="detail-value">${estadia.saida ? formatDateTime(estadia.saida) : 'Em andamento'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Duração:</span>
                        <span class="detail-value">${calculateDuration(estadia.entrada, estadia.saida)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total:</span>
                        <span class="detail-value">${formatCurrency(estadia.valorTotal || 0)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value ${isActive ? 'status-active' : 'status-finished'}">${isActive ? 'Ativo' : 'Finalizado'}</span>
                    </div>
                </div>
            </div>
        `;
        
        openModal('estadia-details');
        
    } catch (error) {
        showToast(error.message, 'error');
        console.error('Erro:', error);
    } finally {
        hideLoading();
    }
}

async function finalizarEstadia(id) {
    if (!confirm('Tem certeza que deseja finalizar esta estadia?')) {
        return;
    }
    
    try {
        showLoading();
        
        const now = new Date().toISOString();
        const response = await fetch(`${API_BASE_URL}/estadias/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                saida: now
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao finalizar estadia');
        }
        
        showToast('Estadia finalizada com sucesso!', 'success');
        
        if (currentSection === 'estadias') {
            loadEstadias();
        }
        if (currentSection === 'dashboard') {
            loadDashboardData();
        }
        
    } catch (error) {
        showToast(error.message, 'error');
        console.error('Erro:', error);
    } finally {
        hideLoading();
    }
}

async function generateReport() {
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    
    if (!dateFrom || !dateTo) {
        showToast('Selecione as datas para gerar o relatório', 'warning');
        return;
    }
    
    try {
        showLoading();
        
        const estadias = await fetchEstadias();
        
        const filteredEstadias = estadias.filter(estadia => {
            const entradaDate = new Date(estadia.entrada).toDateString();
            const fromDate = new Date(dateFrom).toDateString();
            const toDate = new Date(dateTo).toDateString();
            
            return entradaDate >= fromDate && entradaDate <= toDate;
        });
        
        const totalEstadias = filteredEstadias.length;
        const faturamentoTotal = filteredEstadias.reduce((sum, e) => sum + (e.valorTotal || 0), 0);
        const tempoMedio = calculateAverageTime(filteredEstadias);
        
        document.getElementById('report-total-estadias').textContent = totalEstadias;
        document.getElementById('report-faturamento').textContent = formatCurrency(faturamentoTotal);
        document.getElementById('report-tempo-medio').textContent = tempoMedio;
        
        generateReportTable(filteredEstadias);
        
    } catch (error) {
        showToast('Erro ao gerar relatório', 'error');
        console.error('Erro:', error);
    } finally {
        hideLoading();
    }
}

function generateReportTable(estadias) {
    const reportTable = document.getElementById('report-table');
    
    if (estadias.length === 0) {
        reportTable.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Nenhuma estadia encontrada no período selecionado</p>';
        return;
    }
    
    const tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Placa</th>
                    <th>Entrada</th>
                    <th>Saída</th>
                    <th>Duração</th>
                    <th>Valor/Hora</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${estadias.map(estadia => `
                    <tr>
                        <td>${estadia.placa}</td>
                        <td>${formatDateTime(estadia.entrada)}</td>
                        <td>${estadia.saida ? formatDateTime(estadia.saida) : 'Em andamento'}</td>
                        <td>${calculateDuration(estadia.entrada, estadia.saida)}</td>
                        <td>${formatCurrency(estadia.valorHora || 0)}</td>
                        <td>${formatCurrency(estadia.valorTotal || 0)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    reportTable.innerHTML = tableHTML;
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="toast-icon ${icons[type]}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(dateString));
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function formatDateTimeForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
}

function calculateDuration(entrada, saida) {
    if (!entrada) return 'N/A';
    
    const start = new Date(entrada);
    const end = saida ? new Date(saida) : new Date();
    const diff = end - start;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
}

function calculateAverageTime(estadias) {
    if (estadias.length === 0) return '0h 0m';
    
    const totalMinutes = estadias.reduce((sum, estadia) => {
        if (!estadia.entrada) return sum;
        
        const start = new Date(estadia.entrada);
        const end = estadia.saida ? new Date(estadia.saida) : new Date();
        const diff = end - start;
        
        return sum + (diff / (1000 * 60));
    }, 0);
    
    const avgMinutes = totalMinutes / estadias.length;
    const hours = Math.floor(avgMinutes / 60);
    const minutes = Math.floor(avgMinutes % 60);
    
    return `${hours}h ${minutes}m`;
}

window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}



