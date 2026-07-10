const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7sYdUZioU-xpPAw1tjyA6JJIrsWuoUnvYH1VXsh5KAJdTFrEOMhKXRPO-FjuvIUvLEwlmy1_BnUBi/pub?gid=26916754&single=true&output=csv';
        const CSV_BULANAN = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7sYdUZioU-xpPAw1tjyA6JJIrsWuoUnvYH1VXsh5KAJdTFrEOMhKXRPO-FjuvIUvLEwlmy1_BnUBi/pub?gid=1982162520&single=true&output=csv';
        const CSV_RANKING = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7sYdUZioU-xpPAw1tjyA6JJIrsWuoUnvYH1VXsh5KAJdTFrEOMhKXRPO-FjuvIUvLEwlmy1_BnUBi/pub?gid=2047369814&single=true&output=csv';

        Chart.defaults.color = '#b9c8d8';
        Chart.defaults.borderColor = 'rgba(255,255,255,.09)';
        Chart.defaults.font.family = 'Plus Jakarta Sans, Segoe UI, sans-serif';

        let barChart = null;
        let chartBulanan = null;
        let paymentRing = null;
        let spptRing = null;
        let activeRequests = 0;

        const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function parseNumber(value) {
            const raw = String(value ?? '').trim();
            if (!raw) return 0;

            const normalized = raw
                .replace(/\s/g, '')
                .replace(/Rp/gi, '')
                .replace(/\.(?=\d{3}(\D|$))/g, '')
                .replace(',', '.')
                .replace(/[^0-9.-]/g, '');

            const result = Number(normalized);
            return Number.isFinite(result) ? result : 0;
        }

        function rp(value) {
            return 'Rp ' + Math.round(Number(value) || 0).toLocaleString('id-ID');
        }

        function formatPercent(value) {
            return (Number(value) || 0).toLocaleString('id-ID', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + '%';
        }

        function escapeHTML(value) {
            return String(value ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#039;');
        }

        function clampPercent(value) {
            return Math.min(100, Math.max(0, Number(value) || 0));
        }

        function beginRequest() {
            activeRequests += 1;
            setDataStatus('Memperbarui data', false);
        }

        function endRequest(success = true) {
            activeRequests = Math.max(0, activeRequests - 1);
            if (activeRequests === 0) {
                setDataStatus(success ? 'Data terhubung' : 'Gagal memuat data', !success);
                if (success) {
                    const now = new Date();
                    document.getElementById('lastUpdated').textContent = 'Update ' + now.toLocaleTimeString('id-ID', {
                        hour: '2-digit', minute: '2-digit'
                    });
                }
            }
        }

        function setDataStatus(text, isError) {
            document.getElementById('dataStatus').textContent = text;
            document.getElementById('statusDot').classList.toggle('error', Boolean(isError));
        }

        function removeSkeletons() {
            document.querySelectorAll('.skeleton').forEach(item => item.classList.remove('skeleton'));
        }

        function animateValue(id, start, end, duration, prefix = '', suffix = '', decimals = 0) {
            const element = document.getElementById(id);
            if (!element) return;

            if (isReducedMotion) {
                element.textContent = prefix + Number(end).toLocaleString('id-ID', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                }) + suffix;
                return;
            }

            const startTime = performance.now();
            const easing = t => 1 - Math.pow(1 - t, 4);

            function frame(currentTime) {
                const progress = Math.min((currentTime - startTime) / duration, 1);
                const value = start + ((end - start) * easing(progress));

                element.textContent = prefix + Number(value).toLocaleString('id-ID', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                }) + suffix;

                if (progress < 1) requestAnimationFrame(frame);
            }

            requestAnimationFrame(frame);
        }

        function getChartFontSize() {
            if (window.innerWidth >= 1920) return 15;
            if (window.innerWidth <= 576) return 10;
            return 12;
        }

        function chartTooltipBase() {
            return {
                backgroundColor: 'rgba(3, 15, 28, .94)',
                titleColor: '#ffffff',
                bodyColor: '#d8e7f5',
                borderColor: 'rgba(255,255,255,.13)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 12,
                displayColors: true
            };
        }

        function createRingChart(canvasId, currentChart, percent, colors) {
            if (currentChart) currentChart.destroy();

            const canvas = document.getElementById(canvasId);
            const context = canvas.getContext('2d');
            const gradient = context.createLinearGradient(0, 0, canvas.width || 280, canvas.height || 280);
            gradient.addColorStop(0, colors[0]);
            gradient.addColorStop(1, colors[1]);

            return new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: ['Tercapai', 'Sisa'],
                    datasets: [{
                        data: [clampPercent(percent), Math.max(0, 100 - clampPercent(percent))],
                        backgroundColor: [gradient, 'rgba(255,255,255,.075)'],
                        borderWidth: 0,
                        hoverOffset: 3,
                        borderRadius: 10,
                        spacing: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '76%',
                    circumference: 360,
                    rotation: -90,
                    animation: {
                        animateRotate: true,
                        animateScale: true,
                        duration: isReducedMotion ? 0 : 1800,
                        easing: 'easeOutQuart'
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...chartTooltipBase(),
                            callbacks: {
                                label: context => context.label + ': ' + formatPercent(context.raw)
                            }
                        }
                    }
                }
            });
        }

        function renderBarChart(labels, targetData, realisasiData) {
            if (barChart) barChart.destroy();

            const canvas = document.getElementById('barChart');
            const context = canvas.getContext('2d');
            const targetGradient = context.createLinearGradient(0, 0, 0, 430);
            targetGradient.addColorStop(0, 'rgba(96,165,250,.95)');
            targetGradient.addColorStop(1, 'rgba(37,99,235,.40)');

            const realizationGradient = context.createLinearGradient(0, 0, 0, 430);
            realizationGradient.addColorStop(0, 'rgba(52,211,153,.98)');
            realizationGradient.addColorStop(1, 'rgba(5,150,105,.42)');

            barChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Target',
                            data: targetData,
                            backgroundColor: targetGradient,
                            borderColor: 'rgba(147,197,253,.95)',
                            borderWidth: 1,
                            borderRadius: 8,
                            borderSkipped: false,
                            maxBarThickness: 48
                        },
                        {
                            label: 'Realisasi',
                            data: realisasiData,
                            backgroundColor: realizationGradient,
                            borderColor: 'rgba(110,231,183,.95)',
                            borderWidth: 1,
                            borderRadius: 8,
                            borderSkipped: false,
                            maxBarThickness: 48
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    animation: {
                        duration: isReducedMotion ? 0 : 1500,
                        easing: 'easeOutQuart',
                        delay: context => isReducedMotion ? 0 : (context.type === 'data' ? context.dataIndex * 90 + context.datasetIndex * 120 : 0)
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 18,
                                font: { size: getChartFontSize(), weight: 700 }
                            }
                        },
                        tooltip: {
                            ...chartTooltipBase(),
                            callbacks: {
                                label: context => context.dataset.label + ': ' + rp(context.raw)
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: '#c4d3e2',
                                font: { size: getChartFontSize(), weight: 600 },
                                maxRotation: window.innerWidth <= 576 ? 35 : 0,
                                minRotation: window.innerWidth <= 576 ? 35 : 0
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,.075)' },
                            ticks: {
                                color: '#9fb1c4',
                                font: { size: getChartFontSize() },
                                callback: value => new Intl.NumberFormat('id-ID', {
                                    notation: 'compact',
                                    maximumFractionDigits: 1
                                }).format(value)
                            }
                        }
                    }
                }
            });
        }

        function renderMonthlyChart(labels, values) {
            if (chartBulanan) chartBulanan.destroy();

            const canvas = document.getElementById('chartBulanan');
            const context = canvas.getContext('2d');
            const fillGradient = context.createLinearGradient(0, 0, 0, 450);
            fillGradient.addColorStop(0, 'rgba(45,212,191,.36)');
            fillGradient.addColorStop(.55, 'rgba(59,130,246,.15)');
            fillGradient.addColorStop(1, 'rgba(59,130,246,0)');

            const lineGradient = context.createLinearGradient(0, 0, canvas.clientWidth || 900, 0);
            lineGradient.addColorStop(0, '#2dd4bf');
            lineGradient.addColorStop(1, '#60a5fa');

            chartBulanan = new Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Pembayaran',
                        data: values,
                        borderColor: lineGradient,
                        backgroundColor: fillGradient,
                        fill: true,
                        borderWidth: 3,
                        pointRadius: window.innerWidth <= 576 ? 3 : 5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#dffcff',
                        pointBorderColor: '#2dd4bf',
                        pointBorderWidth: 2,
                        tension: .38
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    animation: {
                        duration: isReducedMotion ? 0 : 1900,
                        easing: 'easeOutQuart',
                        x: { from: 0 },
                        y: { from: 0 }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...chartTooltipBase(),
                            callbacks: {
                                label: context => 'Pembayaran: ' + rp(context.raw)
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: '#c4d3e2',
                                autoSkip: false,
                                maxRotation: window.innerWidth <= 768 ? 40 : 0,
                                minRotation: window.innerWidth <= 768 ? 40 : 0,
                                font: { size: getChartFontSize(), weight: 600 }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,.075)' },
                            ticks: {
                                color: '#9fb1c4',
                                font: { size: getChartFontSize() },
                                callback: value => new Intl.NumberFormat('id-ID', {
                                    notation: 'compact',
                                    maximumFractionDigits: 1
                                }).format(value)
                            }
                        }
                    }
                }
            });
        }

        function loadData() {
            beginRequest();

            Papa.parse(CSV_URL, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete(result) {
                    try {
                        const rows = result.data.filter(row => String(row.Dusun ?? '').trim());

                        let totalTarget = 0;
                        let totalRealisasi = 0;
                        let totalSPPT = 0;
                        let totalLunas = 0;
                        let tbody = '';
                        const labels = [];
                        const targetData = [];
                        const realisasiData = [];

                        rows.forEach(row => {
                            const target = parseNumber(row.Target);
                            const realisasi = parseNumber(row.Realisasi);
                            const spptTarget = parseNumber(row.SPPT_Target);
                            const spptLunas = parseNumber(row.SPPT_Lunas);
                            const sisa = Math.max(0, target - realisasi);
                            const spptSisa = Math.max(0, spptTarget - spptLunas);
                            const persen = target > 0 ? (realisasi / target) * 100 : 0;
                            const progressWidth = clampPercent(persen);

                            totalTarget += target;
                            totalRealisasi += realisasi;
                            totalSPPT += spptTarget;
                            totalLunas += spptLunas;

                            labels.push(String(row.Dusun));
                            targetData.push(target);
                            realisasiData.push(realisasi);

                            tbody += `
                                <tr>
                                    <td><strong>${escapeHTML(row.Dusun)}</strong></td>
                                    <td>${rp(target)}</td>
                                    <td class="text-success">${rp(realisasi)}</td>
                                    <td class="text-danger">${rp(sisa)}</td>
                                    <td>${Math.round(spptTarget).toLocaleString('id-ID')}</td>
                                    <td class="text-success">${Math.round(spptLunas).toLocaleString('id-ID')}</td>
                                    <td>${Math.round(spptSisa).toLocaleString('id-ID')}</td>
                                    <td>${formatPercent(persen)}</td>
                                    <td>
                                        <div class="progress" role="progressbar" aria-label="Progress ${escapeHTML(row.Dusun)}" aria-valuenow="${progressWidth}" aria-valuemin="0" aria-valuemax="100">
                                            <div class="progress-bar" style="width:${progressWidth}%">${formatPercent(persen)}</div>
                                        </div>
                                    </td>
                                </tr>`;
                        });

                        if ($.fn.DataTable.isDataTable('#tbl')) {
                            $('#tbl').DataTable().destroy();
                        }

                        document.querySelector('#tbl tbody').innerHTML = tbody;

                        $('#tbl').DataTable({
                            responsive: true,
                            autoWidth: false,
                            pageLength: 10,
                            order: [],
                            language: {
                                search: 'Cari:',
                                lengthMenu: 'Tampilkan _MENU_ data',
                                info: 'Menampilkan _START_–_END_ dari _TOTAL_ data',
                                infoEmpty: 'Belum ada data',
                                zeroRecords: 'Data tidak ditemukan',
                                paginate: { previous: 'Sebelumnya', next: 'Berikutnya' }
                            }
                        });

                        const totalSisa = Math.max(0, totalTarget - totalRealisasi);
                        const persenUang = totalTarget > 0 ? (totalRealisasi / totalTarget) * 100 : 0;
                        const persenSPPT = totalSPPT > 0 ? (totalLunas / totalSPPT) * 100 : 0;

                        document.getElementById('ftTarget').textContent = rp(totalTarget);
                        document.getElementById('ftRealisasi').textContent = rp(totalRealisasi);
                        document.getElementById('ftSisa').textContent = rp(totalSisa);
                        document.getElementById('ftSPPT').textContent = Math.round(totalSPPT).toLocaleString('id-ID');
                        document.getElementById('ftLunas').textContent = Math.round(totalLunas).toLocaleString('id-ID');
                        document.getElementById('ftBelum').textContent = Math.round(Math.max(0, totalSPPT - totalLunas)).toLocaleString('id-ID');
                        document.getElementById('ftPersen').textContent = formatPercent(persenUang);
                        document.getElementById('ftProgress').innerHTML = `
                            <div class="progress" role="progressbar" aria-valuenow="${clampPercent(persenUang)}" aria-valuemin="0" aria-valuemax="100">
                                <div class="progress-bar" style="width:${clampPercent(persenUang)}%">${formatPercent(persenUang)}</div>
                            </div>`;

                        removeSkeletons();
                        animateValue('totalTarget', 0, totalTarget, 1900, 'Rp ');
                        animateValue('totalRealisasi', 0, totalRealisasi, 1900, 'Rp ');
                        animateValue('totalSisa', 0, totalSisa, 1900, 'Rp ');
                        animateValue('persenUang', 0, persenUang, 1500, '', '%', 2);
                        animateValue('totalSPPT', 0, totalSPPT, 1450, '', ' Lembar');
                        animateValue('spptLunas', 0, totalLunas, 1450, '', ' Lembar');
                        animateValue('spptBelum', 0, Math.max(0, totalSPPT - totalLunas), 1450, '', ' Lembar');
                        animateValue('persenSPPT', 0, persenSPPT, 1500, '', '%', 2);
                        animateValue('circlePersen1', 0, persenUang, 1500, '', '%', 2);
                        animateValue('circlePersen2', 0, persenSPPT, 1500, '', '%', 2);

                        paymentRing = createRingChart('paymentRing', paymentRing, persenUang, ['#2dd4bf', '#22c55e']);
                        spptRing = createRingChart('spptRing', spptRing, persenSPPT, ['#60a5fa', '#8b5cf6']);
                        renderBarChart(labels, targetData, realisasiData);

                        endRequest(true);
                    } catch (error) {
                        console.error('Gagal memproses data utama:', error);
                        endRequest(false);
                    }
                },
                error(error) {
                    console.error('Gagal memuat data utama:', error);
                    endRequest(false);
                }
            });
        }

        function loadBulanan() {
            beginRequest();

            Papa.parse(CSV_BULANAN, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete(result) {
                    try {
                        const rows = result.data.filter(row => String(row.Bulan ?? '').trim());
                        const labels = [];
                        const values = [];
                        let total = 0;

                        rows.forEach(row => {
                            const value = parseNumber(row.Pemasukan);
                            labels.push(String(row.Bulan));
                            values.push(value);
                            total += value;
                        });

                        document.getElementById('totalBulanan').textContent = rp(total);
                        renderMonthlyChart(labels, values);
                        endRequest(true);
                    } catch (error) {
                        console.error('Gagal memproses data bulanan:', error);
                        endRequest(false);
                    }
                },
                error(error) {
                    console.error('Gagal memuat data bulanan:', error);
                    endRequest(false);
                }
            });
        }

        function loadRanking() {
            beginRequest();

            Papa.parse(CSV_RANKING, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete(result) {
                    try {
                        const row = result.data.find(item => String(item.Ranking ?? '').trim());
                        if (!row) throw new Error('Data peringkat kosong');

                        const ranking = Math.round(parseNumber(row.Ranking));
                        const total = Math.round(parseNumber(row.Total_Desa));
                        const medal = ranking === 1 ? '🥇' : ranking === 2 ? '🥈' : ranking === 3 ? '🥉' : '🏅';

                        document.getElementById('rankingNumber').textContent = medal + ' ' + ranking;
                        document.getElementById('rankingDesc').textContent = `dari ${total.toLocaleString('id-ID')} desa se-Kecamatan Kanigoro, Kabupaten Blitar`;
                        endRequest(true);
                    } catch (error) {
                        console.error('Gagal memproses peringkat:', error);
                        document.getElementById('rankingDesc').textContent = 'Data peringkat belum tersedia';
                        endRequest(false);
                    }
                },
                error(error) {
                    console.error('Gagal memuat data peringkat:', error);
                    document.getElementById('rankingDesc').textContent = 'Data peringkat gagal dimuat';
                    endRequest(false);
                }
            });
        }

        function refreshAll() {
            const button = document.getElementById('refreshButton');
            button.classList.remove('spin-once');
            void button.offsetWidth;
            button.classList.add('spin-once');

            loadData();
            loadBulanan();
            loadRanking();
        }

        function updateClock() {
            document.getElementById('jam').textContent = new Date().toLocaleString('id-ID', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        function initRevealAnimation() {
            const cards = document.querySelectorAll('.fade-card');
            cards.forEach((card, index) => card.style.setProperty('--delay', `${Math.min(index * 70, 700)}ms`));

            if (!('IntersectionObserver' in window) || isReducedMotion) {
                cards.forEach(card => card.classList.add('show'));
                return;
            }

            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('show');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: .08 });

            cards.forEach(card => observer.observe(card));
        }

        document.getElementById('refreshButton').addEventListener('click', refreshAll);

        document.getElementById('fullscreenButton').addEventListener('click', async () => {
            try {
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                } else {
                    await document.exitFullscreen();
                }
            } catch (error) {
                console.error('Mode fullscreen tidak tersedia:', error);
            }
        });

        document.addEventListener('fullscreenchange', () => {
            const icon = document.querySelector('#fullscreenButton i');
            icon.className = document.fullscreenElement ? 'bi bi-fullscreen-exit' : 'bi bi-arrows-fullscreen';
        });

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                barChart?.resize();
                chartBulanan?.resize();
                paymentRing?.resize();
                spptRing?.resize();
            }, 180);
        });

        initRevealAnimation();
        updateClock();
        setInterval(updateClock, 1000);
        refreshAll();
        setInterval(refreshAll, 300000);
