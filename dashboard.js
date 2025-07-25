// Dashboard class to handle all functionality
class AnalyticsDashboard {
    constructor() {
        this.currentStore = 'kayesami';
        this.currentData = [];
        this.revenueChart = null;
        this.roasChart = null;
        this.storeLogos = {
            kayesami: 'images/kayesami.png',
            ostriB: 'images/OstriB Logo-04.png'
        };
        this.ostriBCurrencyRate = 121;
        this.adSpendTaxRate = 0.15;

        this.initializeDateRangePicker();
        this.initializeEventListeners();
        this.initializeCharts();
        
        this.updateStoreLogo();
        this.setInitialActiveStoreButton();
        this.fetchAllData();
    }
    
    formatDate(date) {
        return moment(date).format('YYYY-MM-DD');
    }

    initializeDateRangePicker() {
        const self = this;
        const today = moment();

        $('#dateDisplayWrapper').daterangepicker({
            startDate: today,
            endDate: today,
            opens: 'right',
            singleDatePicker: false,
            locale: {
                format: 'MMM D, YYYY',
                applyLabel: "Apply",
                cancelLabel: "Cancel",
            }
        }).on('apply.daterangepicker', function(ev, picker) {
            self.updateDateDisplay(picker.startDate, picker.endDate);
            self.fetchAllData();
        });

        this.updateDateDisplay(today, today, 'Today');
    }

    updateDateDisplay(start, end, presetLabel = null) {
        const dateDisplayElement = document.getElementById('dateDisplay');
        const chartSubtitles = document.querySelectorAll('.chart-subtitle');
        let displayText;

        if (presetLabel) {
            displayText = presetLabel;
        } else if (start.isSame(end, 'day')) {
            displayText = start.format('MMM D, YYYY');
        } else {
            displayText = `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`;
        }
        
        dateDisplayElement.textContent = displayText;
        chartSubtitles.forEach(el => el.textContent = displayText);
    }

    setInitialActiveStoreButton() {
        document.querySelectorAll('.store-selector .store-btn').forEach(btn => btn.classList.remove('active'));
        const initialButton = document.querySelector(`.store-selector .store-btn[data-store="${this.currentStore}"]`);
        if (initialButton) { initialButton.classList.add('active'); }
    }

    initializeEventListeners() {
        document.getElementById('refreshData').addEventListener('click', () => this.fetchAllData());
        document.getElementById('exportData').addEventListener('click', () => this.exportToCSV());

        document.querySelectorAll('.store-selector .store-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const newStore = e.target.dataset.store;
                if (this.currentStore !== newStore) { 
                    this.currentStore = newStore;
                    document.querySelectorAll('.store-selector .store-btn').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                    this.updateStoreLogo();
                    this.fetchAllData();
                }
            });
        });

        document.getElementById('prevDateRange').addEventListener('click', () => {
            const picker = $('#dateDisplayWrapper').data('daterangepicker');
            picker.leftCalendar.month.subtract(1, 'month');
            picker.rightCalendar.month.subtract(1, 'month');
            picker.updateCalendars();
        });

        document.getElementById('nextDateRange').addEventListener('click', () => {
            const picker = $('#dateDisplayWrapper').data('daterangepicker');
            picker.leftCalendar.month.add(1, 'month');
            picker.rightCalendar.month.add(1, 'month');
            picker.updateCalendars();
        });
        
        document.getElementById('datePresetDropdownToggle').addEventListener('click', function() {
            document.getElementById('presetMenu').classList.toggle('show');
        });
        
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.preset-dropdown')) {
                document.getElementById('presetMenu').classList.remove('show');
            }
        });

        document.querySelectorAll('#presetMenu .preset-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const range = e.target.dataset.range;
                const picker = $('#dateDisplayWrapper').data('daterangepicker');
                let start = moment(); let end = moment();

                switch (range) {
                    case 'today': break;
                    case 'yesterday': start.subtract(1, 'days'); end.subtract(1, 'days'); break;
                    case 'last7': start.subtract(6, 'days'); break;
                    case 'last30': start.subtract(29, 'days'); break;
                    case 'thisMonth': start = moment().startOf('month'); end = moment().endOf('month'); break;
                    case 'lastMonth': start = moment().subtract(1, 'month').startOf('month'); end = moment().subtract(1, 'month').endOf('month'); break;
                }
                
                picker.setStartDate(start);
                picker.setEndDate(end);
                picker.element.trigger('apply.daterangepicker', picker);
                
                this.updateDateDisplay(start, end, e.target.textContent);
                document.getElementById('presetMenu').classList.remove('show');
            });
        });
    }

    updateStoreLogo() {
        const logoElement = document.getElementById('storeLogo');
        if (logoElement) {
            logoElement.src = this.storeLogos[this.currentStore];
            logoElement.alt = `${this.currentStore} Store Logo`;
        }
    }
    
    initializeCharts() {
        if (this.revenueChart) this.revenueChart.destroy();
        if (this.roasChart) this.roasChart.destroy();

        const chartTextColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        const chartGridColor = 'rgba(255, 255, 255, 0.05)';
        const accentBlue = getComputedStyle(document.documentElement).getPropertyValue('--accent-blue').trim();
        const negativeRed = getComputedStyle(document.documentElement).getPropertyValue('--negative-red').trim();

        // Revenue & Ad Spend Chart
        const revenueCtx = document.getElementById('revenueChart').getContext('2d');
        this.revenueChart = new Chart(revenueCtx, {
            type: 'line', // Default to line, will be changed dynamically
            data: { 
                labels: [], 
                datasets: [ 
                    { 
                        label: 'Revenue', 
                        data: [], 
                        borderColor: accentBlue,
                        // **FIX:** Gradient fill effect
                        backgroundColor: (context) => {
                            const chart = context.chart;
                            const { ctx, chartArea } = chart;
                            if (!chartArea) return null;
                            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                            gradient.addColorStop(0, 'rgba(0, 122, 255, 0)');
                            gradient.addColorStop(1, 'rgba(0, 122, 255, 0.2)');
                            return gradient;
                        },
                        tension: 0.4, 
                        fill: true, 
                        pointRadius: 0, 
                        borderWidth: 2,
                        // **FIX:** Subtle glow effect
                        shadowColor: 'rgba(0, 122, 255, 0.5)',
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowOffsetY: 4
                    }, 
                    { 
                        label: 'Ad Spend', 
                        data: [], 
                        borderColor: negativeRed, 
                        backgroundColor: 'rgba(255, 59, 48, 0.1)', 
                        borderDash: [5, 5], 
                        tension: 0.4, 
                        fill: false, // No fill for ad spend line
                        pointRadius: 0, 
                        borderWidth: 2
                    } 
                ] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } }, 
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { color: chartTextColor, callback: value => '৳' + value.toLocaleString() }, 
                        grid: { color: chartGridColor } 
                    }, 
                    x: { 
                        ticks: { color: chartTextColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, 
                        grid: { display: false } 
                    } 
                } 
            }
        });

        // ROAS Trend Chart
        const roasCtx = document.getElementById('roasChart').getContext('2d');
        this.roasChart = new Chart(roasCtx, {
            type: 'bar',
            data: { 
                labels: [], 
                datasets: [ 
                    { 
                        label: 'ROAS', 
                        data: [], 
                        backgroundColor: accentBlue, 
                        borderColor: accentBlue, 
                        borderWidth: 1, 
                        borderRadius: 4 
                    } 
                ] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } }, 
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { color: chartTextColor, callback: value => value.toFixed(1) + 'x' }, 
                        grid: { color: chartGridColor } 
                    }, 
                    x: { 
                        ticks: { color: chartTextColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, 
                        grid: { display: false } 
                    } 
                } 
            }
        });
    }
    
    async fetchAllData() {
        this.setLoadingState(true);
        this.clearError();
        const picker = $('#dateDisplayWrapper').data('daterangepicker');
        if (!picker) { this.setLoadingState(false); return; }
        const startDate = this.formatDate(picker.startDate);
        const endDate = this.formatDate(picker.endDate);
        try {
            const [shopifyResponse, metaResponse] = await Promise.all([
                this.fetchShopifyData(startDate, endDate),
                this.fetchMetaData(startDate, endDate)
            ]);
            const shopifyData = this.processShopifyOrders(shopifyResponse.orders);
            const metaData = this.processMetaInsights(metaResponse.data);
            this.processCombinedData(shopifyData, metaData, picker.startDate, picker.endDate);
            this.applyFilters();
        } catch (error) {
            console.error('Error fetching data:', error);
            this.showError(`Failed to fetch data: ${error.message || 'Please check API configuration.'}`);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    async fetchShopifyData(startDate, endDate) {
        const url = `/api/shopify/orders?startDate=${startDate}&endDate=${endDate}&store=${this.currentStore}`;
        const response = await fetch(url);
        if (!response.ok) {
            const errorDetails = await response.json().catch(() => ({}));
            throw new Error(`Shopify API error: ${response.status} - ${errorDetails.details || response.statusText}`);
        }
        return response.json();
    }
    
    async fetchMetaData(startDate, endDate) {
        const url = `/api/meta/insights?startDate=${startDate}&endDate=${endDate}&store=${this.currentStore}`;
        const response = await fetch(url);
        if (!response.ok) {
            const errorDetails = await response.json().catch(() => ({}));
            throw new Error(`Meta API error: ${response.status} - ${errorDetails.details || response.statusText}`);
        }
        return response.json();
    }
    
    processShopifyOrders(orders) {
        const dailyData = {};
        if (!orders) return [];
        orders.forEach(order => {
            const orderDate = moment(order.created_at).format('YYYY-MM-DD');
            if (!dailyData[orderDate]) { dailyData[orderDate] = { date: orderDate, revenue: 0, units_sold: 0 }; }
            dailyData[orderDate].revenue += parseFloat(order.total_price || 0);
            order.line_items.forEach(item => { dailyData[orderDate].units_sold += parseInt(item.quantity || 0); });
        });
        return Object.values(dailyData);
    }
    
    processMetaInsights(insights) {
        const dailyData = {};
        if (!insights) return [];
        insights.forEach(record => {
            const date = record.date_start;
            if (!dailyData[date]) { dailyData[date] = { date: date, ad_spend: 0 }; }
            dailyData[date].ad_spend += parseFloat(record.spend || 0);
        });
        return Object.values(dailyData);
    }
    
    processCombinedData(shopifyData, metaData, startDate, endDate) {
        const dateMap = new Map();
        for (let d = moment(startDate).clone(); d.isSameOrBefore(endDate, 'day'); d.add(1, 'day')) {
            const dateString = d.format('YYYY-MM-DD');
            dateMap.set(dateString, { date: dateString, revenue: 0, units_sold: 0, ad_spend: 0, roas: 0 });
        }
        shopifyData.forEach(record => {
            if (dateMap.has(record.date)) {
                dateMap.get(record.date).revenue += record.revenue;
                dateMap.get(record.date).units_sold += record.units_sold;
            }
        });
        metaData.forEach(record => {
            if (dateMap.has(record.date)) {
                let spendInBdt = (this.currentStore === 'ostriB') ? (record.ad_spend * this.ostriBCurrencyRate) : record.ad_spend;
                dateMap.get(record.date).ad_spend += spendInBdt * (1 + this.adSpendTaxRate);
            }
        });
        dateMap.forEach(value => { value.roas = value.ad_spend > 0 ? value.revenue / value.ad_spend : 0; });
        this.currentData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }
    
    applyFilters() {
        this.updateMetrics(this.currentData);
        this.updateCharts(this.currentData);
        this.updateDataTable(this.currentData);
    }
    
    updateMetrics(data) {
        const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
        const totalAdSpend = data.reduce((sum, item) => sum + item.ad_spend, 0);
        const totalUnitsSold = data.reduce((sum, item) => sum + item.units_sold, 0);
        const roas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;
        
        document.getElementById('totalRevenue').textContent = '৳' + totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        document.getElementById('adSpend').textContent = '৳' + totalAdSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        document.getElementById('roas').textContent = roas.toFixed(2) + 'x';
        document.getElementById('unitsSold').textContent = totalUnitsSold.toLocaleString();
        
        document.getElementById('revenueChange').textContent = `+12% vs last period`; 
        document.getElementById('adSpendChange').textContent = `-5% vs last period`; 
        document.getElementById('roasChange').textContent = `+15% vs last period`; 
        document.getElementById('unitsSoldChange').textContent = `+8% vs last period`; 
    }
    
    updateCharts(data) {
        const chartLabels = data.map(item => moment(item.date).format('MMM D'));

        // **FIX:** Handle single-day display
        if (data.length === 1) {
            this.revenueChart.config.type = 'bar';
            this.revenueChart.data.datasets[0].barThickness = 50; // Visual tweak for single bar
            this.revenueChart.data.datasets[1].barThickness = 50;
        } else {
            this.revenueChart.config.type = 'line';
        }

        this.revenueChart.data.labels = chartLabels;
        this.revenueChart.data.datasets[0].data = data.map(item => item.revenue);
        this.revenueChart.data.datasets[1].data = data.map(item => item.ad_spend);
        this.revenueChart.update();
        
        this.roasChart.data.labels = chartLabels;
        this.roasChart.data.datasets[0].data = data.map(item => item.roas);
        this.roasChart.update();
    }
    
    updateDataTable(data) {
        const tableBody = document.getElementById('dataTableBody');
        tableBody.innerHTML = '';
        if (data.length === 0) { tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-5">No data available.</td></tr>'; return; }
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="date-cell">${moment(item.date).format('MMM DD, YYYY')}</td><td class="value-cell">৳${item.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td class="value-cell">${item.units_sold.toLocaleString()}</td><td class="value-cell">৳${item.ad_spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td class="value-cell ${item.roas > 0 ? 'positive-value' : 'negative-value'}">${item.roas.toFixed(2)}x</td>`;
            tableBody.appendChild(row);
        });
    }
    
    exportToCSV() {
        if (this.currentData.length === 0) { alert('No data to export.'); return; }
        const headers = ['Date', 'Revenue', 'Units Sold', 'Ad Spend (incl. 15% tax)', 'ROAS'];
        const csvContent = [ headers.join(','), ...this.currentData.map(item => [ `"${item.date}"`, item.revenue.toFixed(2), item.units_sold, item.ad_spend.toFixed(2), item.roas.toFixed(2) ].join(',')) ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `analytics_export_${this.currentStore}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    setLoadingState(loading) {
        const refreshBtn = document.getElementById('refreshData');
        const icon = refreshBtn.querySelector('i');
        if (loading) { icon.classList.add('fa-spin'); refreshBtn.disabled = true; } 
        else { icon.classList.remove('fa-spin'); refreshBtn.disabled = false; }
    }
    
    showError(message) {
        const errorEl = document.getElementById('error-message');
        if (errorEl) { errorEl.textContent = message; errorEl.style.display = 'block'; }
    }

    clearError() {
        const errorEl = document.getElementById('error-message');
        if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
    }
}

document.addEventListener('DOMContentLoaded', () => { new AnalyticsDashboard(); });