// Configuração da API
const API_BASE_URL = 'http://localhost:3001';

// Estado da aplicação
let currentVehicles = [];
let currentSection = 'dashboard';
let selectedVehicle = null;

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Definir datas padrão para relatórios
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('date-from').value = formatDateForInput(firstDay);
    document.getElementById('date-to').value = formatDateForInput(today);
    
    // Carregar dados iniciais
    loadDashboardData();
    loadVehicles();
    
    // Configurar formulário
    setupVehicleForm();
    
    // Mostrar dashboard por padrão
    showSection('dashboard');
}

// Navegação entre seções
function showSection(sectionName) {
    // Remover classe active de todas as seções
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remover classe active de todos os botões
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar seção selecionada
    document.getElementById(sectionName).classList.add('active');
    document.getElementById(sectionName + '-btn').classList.add('active');
    
    currentSection = sectionName;
    
    // Carregar dados específicos da seção
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'veiculos':
            loadVehicles();
            break;
        case 'relatorios':
            generateReport();
            break;
    }
}

// Toggle menu mobile
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('active');
}

// Carregar dados do dashboard
async function loadDashboardData() {
    showLoading();
    
    try {
        const vehicles = await fetchVehicles();
        const today = new Date().toDateString();
        
        // Calcular estatísticas
        const activeVehicles = vehicles.filter(v => !v.saida || new Date(v.saida) > new Date());
        const todayStays = vehicles.filter(v => new Date(v.entrada).toDateString() === today);
        const todayRevenue = todayStays.reduce((sum, v) => sum + (v.valorTotal || 0), 0);
        const availableSpots = Math.max(0, 50 - activeVehicles.length); // Assumindo 50 vagas totais
        
        // Atualizar elementos do dashboard
        document.getElementById('total-veiculos').textContent = activeVehicles.length;
        document.getElementById('estadias-hoje').textContent = todayStays.length;
        document.getElementById('faturamento-hoje').textContent = formatCurrency(todayRevenue);
        document.getElementById('vagas-disponiveis').textContent = availableSpots;
        
        // Carregar atividades recentes
        loadRecentActivities(vehicles.slice(-5).reverse());
        
    } catch (error) {
        showToast('Erro ao carregar dados do dashboard', 'error');
        console.error('Erro:', error);
    } finally {
        hideLoading();
    }
}

// Carregar atividades recentes
function loadRecentActivities(recentVehicles) {
    const recentList = document.getElementById('recent-list');
    
    if (recentVehicles.length === 0) {
        recentList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Nenhuma atividade recente</p>';
        return;
    }
    
    recentList.innerHTML = recentVehicles.map(vehicle => `
        <div class="activity-item">
            <div class="activity-info">
                <h4>${vehicle.placa} - ${vehicle.proprietario}</h4>
                <p>${vehicle.marca} ${vehicle.modelo} (${vehicle.tipo})</p>
            </div>
            <div class="activity-time">
                ${formatDateTime(vehicle.entrada)}
            </div>
        </div>
    `).join('');
}

// Carregar veículos
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

// Buscar veículos da API
async function fetchVehicles() {
    const response = await fetch(`${API_BASE_URL}/veiculos`);
    if (!response.ok) {
        throw new Error('Erro ao buscar veículos');
    }
    return await response.json();
}

// Exibir veículos na grid
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
        const isActive = !vehicle.saida || new Date(vehicle.saida) > new Date();
        const statusClass = isActive ? 'status-active' : 'status-finished';
        const statusText = isActive ? 'Ativo' : 'Finalizado';
        const total = vehicle.valorTotal || 'Calculando...';
        
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
                    <div class="vehicle-status">
                        <div class="status-badge ${statusClass}">${statusText}</div>
                        <div class="vehicle-total">${typeof total === 'number' ? formatCurrency(total) : total}</div>
                    </div>
                    <div class="vehicle-actions">
                        <button class="btn-secondary btn-small" onclick="showVehicleDetails('${vehicle.placa}')">
                            <i class="fas fa-info-circle"></i> Detalhes
                        </button>
                        <button class="btn-primary btn-small" onclick="editVehicle('${vehicle.placa}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filtrar veículos
function filterVehicles() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const typeFilter = document.getElementById('type-filter').value;
    
    let filteredVehicles = currentVehicles;
    
    // Filtro por texto
    if (searchTerm) {
        filteredVehicles = filteredVehicles.filter(vehicle => 
            vehicle.placa.toLowerCase().includes(searchTerm) ||
            vehicle.proprietario.toLowerCase().includes(searchTerm) ||
            vehicle.modelo.toLowerCase().includes(searchTerm) ||
            vehicle.marca.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filtro por tipo
    if (typeFilter) {
        filteredVehicles = filteredVehicles.filter(vehicle => 
            vehicle.tipo === typeFilter
        );
    }
    
    displayVehicles(filteredVehicles);
}

// Configurar formulário de veículo
function setupVehicleForm() {
    const form = document.getElementById('vehicle-form');
    form.addEventListener('submit', handleVehicleSubmit);
}

// Manipular envio do formulário (criação e edição)
async function handleVehicleSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const placaOriginal = formData.get('placa-original'); // Campo oculto para edição
    
    const vehicleData = {
        placa: formData.get('placa').toUpperCase(),
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
    
    if (placaOriginal) { // Se placaOriginal existe, é uma edição
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
        document.getElementById('placa').disabled = false; // Habilitar placa para novo cadastro
        document.getElementById('placa-original').value = ''; // Limpar campo oculto
        
        // Recarregar dados
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

// Abrir modal de cadastro/edição
function openVehicleModal(vehicle = null) {
    const form = document.getElementById('vehicle-form');
    form.reset();
    document.getElementById('placa').disabled = false; // Habilitar placa por padrão
    document.getElementById('placa-original').value = ''; // Limpar campo oculto

    if (vehicle) {
        document.getElementById('modal-title-vehicle').textContent = 'Editar Veículo';
        document.getElementById('placa').value = vehicle.placa;
        document.getElementById('placa').disabled = true; // Desabilitar edição da placa
        document.getElementById('placa-original').value = vehicle.placa; // Guardar placa original
        document.getElementById('tipo').value = vehicle.tipo;
        document.getElementById('proprietario').value = vehicle.proprietario;
        document.getElementById('telefone').value = vehicle.telefone;
        document.getElementById('marca').value = vehicle.marca;
        document.getElementById('modelo').value = vehicle.modelo;
        document.getElementById('cor').value = vehicle.cor;
        document.getElementById('ano').value = vehicle.ano;
    } else {
        document.getElementById('modal-title-vehicle').textContent = 'Cadastro de Veículo';
    }
    openModal('add-vehicle');
}

// Função para iniciar a edição de um veículo
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

// Mostrar detalhes do veículo
async function showVehicleDetails(placa) {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE_URL}/veiculos/${placa}`);
        if (!response.ok) {
            throw new Error('Erro ao buscar detalhes do veículo');
        }
        
        const vehicle = await response.json();
        selectedVehicle = vehicle;
        
        const detailsContent = document.getElementById('vehicle-details-content');
        const isActive = !vehicle.saida || new Date(vehicle.saida) > new Date();
        
        detailsContent.innerHTML = `
            <div class="detail-grid">
                <div class="detail-section">
                    <h4><i class="fas fa-car"></i> Informações do Veículo</h4>
                    <div class="detail-item">
                        <span class="detail-label">Placa:</span>
                        <span class="detail-value">${vehicle.placa}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Tipo:</span>
                        <span class="detail-value">${vehicle.tipo}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Marca:</span>
                        <span class="detail-value">${vehicle.marca}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Modelo:</span>
                        <span class="detail-value">${vehicle.modelo}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Cor:</span>
                        <span class="detail-value">${vehicle.cor}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Ano:</span>
                        <span class="detail-value">${vehicle.ano}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-user"></i> Proprietário</h4>
                    <div class="detail-item">
                        <span class="detail-label">Nome:</span>
                        <span class="detail-value">${vehicle.proprietario}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Telefone:</span>
                        <span class="detail-value">${vehicle.telefone}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-clock"></i> Estadia</h4>
                    <div class="detail-item">
                        <span class="detail-label">Entrada:</span>
                        <span class="detail-value">${formatDateTime(vehicle.entrada)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Saída:</span>
                        <span class="detail-value">${vehicle.saida ? formatDateTime(vehicle.saida) : 'Em andamento'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Duração:</span>
                        <span class="detail-value">${calculateDuration(vehicle.entrada, vehicle.saida)}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-dollar-sign"></i> Valores</h4>
                    <div class="detail-item">
                        <span class="detail-label">Valor/Hora:</span>
                        <span class="detail-value">${formatCurrency(vehicle.valorHora || 0)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total:</span>
                        <span class="detail-value">${vehicle.valorTotal ? formatCurrency(vehicle.valorTotal) : 'Calculando...'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value">
                            <span class="status-badge ${isActive ? 'status-active' : 'status-finished'}">
                                ${isActive ? 'Ativo' : 'Finalizado'}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        // Mostrar/ocultar botão de saída
        const exitButton = document.querySelector('#vehicle-details .btn-danger');
        exitButton.style.display = isActive ? 'inline-flex' : 'none';
        
        openModal('vehicle-details');
        
    } catch (error) {
        showToast('Erro ao carregar detalhes do veículo', 'error');
        console.error('Erro:', error);
    } finally {
        hideLoading();
    }
}

// Registrar saída do veículo
async function registrarSaida() {
    if (!selectedVehicle) return;
    
    if (!confirm(`Confirma a saída do veículo ${selectedVehicle.placa}?`)) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE_URL}/veiculos/${selectedVehicle.placa}/saida`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao registrar saída');
        }
        
        const result = await response.json();
        
        showToast('Saída registrada com sucesso!', 'success');
        closeModal('vehicle-details');
        
        // Recarregar dados
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

// Gerar relatório
async function generateReport() {
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    
    if (!dateFrom || !dateTo) {
        showToast('Selecione o período para o relatório', 'warning');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE_URL}/estadias?dataInicio=${dateFrom}&dataFim=${dateTo}`);
        if (!response.ok) {
            throw new Error('Erro ao gerar relatório');
        }
        
        const reportData = await response.json();
        displayReport(reportData);
        
    } catch (error) {
        showToast('Erro ao gerar relatório', 'error');
        console.error('Erro:', error);
        
        // Mostrar dados mockados em caso de erro
        const mockData = generateMockReport();
        displayReport(mockData);
    } finally {
        hideLoading();
    }
}

// Exibir relatório
function displayReport(data) {
    // Atualizar resumo
    document.getElementById('report-total-estadias').textContent = data.totalEstadias || 0;
    document.getElementById('report-faturamento').textContent = formatCurrency(data.faturamentoTotal || 0);
    document.getElementById('report-tempo-medio').textContent = data.tempoMedio || '0h 0m';
    
    // Atualizar tabela
    const reportTable = document.getElementById('report-table');
    
    if (!data.estadias || data.estadias.length === 0) {
        reportTable.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">Nenhuma estadia encontrada no período selecionado</p>';
        return;
    }
    
    reportTable.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Placa</th>
                    <th>Proprietário</th>
                    <th>Tipo</th>
                    <th>Entrada</th>
                    <th>Saída</th>
                    <th>Duração</th>
                    <th>Valor</th>
                </tr>
            </thead>
            <tbody>
                ${data.estadias.map(estadia => `
                    <tr>
                        <td><strong>${estadia.placa}</strong></td>
                        <td>${estadia.proprietario}</td>
                        <td>${estadia.tipo}</td>
                        <td>${formatDateTime(estadia.entrada)}</td>
                        <td>${estadia.saida ? formatDateTime(estadia.saida) : 'Em andamento'}</td>
                        <td>${calculateDuration(estadia.entrada, estadia.saida)}</td>
                        <td>${estadia.valorTotal ? formatCurrency(estadia.valorTotal) : 'Calculando...'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Gerar dados mockados para relatório
function generateMockReport() {
    const vehicles = currentVehicles || [];
    const dateFrom = new Date(document.getElementById('date-from').value);
    const dateTo = new Date(document.getElementById('date-to').value);
    
    const filteredVehicles = vehicles.filter(v => {
        const entryDate = new Date(v.entrada);
        return entryDate >= dateFrom && entryDate <= dateTo;
    });
    
    const totalRevenue = filteredVehicles.reduce((sum, v) => sum + (v.valorTotal || 0), 0);
    const avgDuration = filteredVehicles.length > 0 ? 
        filteredVehicles.reduce((sum, v) => {
            const duration = calculateDurationInMinutes(v.entrada, v.saida);
            return sum + duration;
        }, 0) / filteredVehicles.length : 0;
    
    return {
        totalEstadias: filteredVehicles.length,
        faturamentoTotal: totalRevenue,
        tempoMedio: formatDuration(avgDuration),
        estadias: filteredVehicles
    };
}

// Funções de modal
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Funções de loading
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Sistema de notificações toast
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
        <div class="toast-message">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remover toast após 5 segundos
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Funções utilitárias
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function calculateDuration(startDate, endDate) {
    if (!startDate) return 'N/A';
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end - start;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
}

function calculateDurationInMinutes(startDate, endDate) {
    if (!startDate) return 0;
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end - start;
    
    return Math.floor(diffMs / (1000 * 60));
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
}

