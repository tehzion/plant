jQuery(document).ready(function($) {
    'use strict';
    
    if (typeof nemCalcSettings !== 'undefined' && nemCalcSettings.colors) {
        const colors = nemCalcSettings.colors;
        const root = document.documentElement;
        
        root.style.setProperty('--nem-primary', colors.primary);
        root.style.setProperty('--nem-secondary', colors.secondary);
        root.style.setProperty('--nem-accent', colors.accent);
        root.style.setProperty('--nem-button-text', colors.buttonText);
    }
    
    const locationData = {
        johor_bahru: { name: 'Johor Bahru', irradiance: 4.7 },
        batu_pahat: { name: 'Batu Pahat', irradiance: 4.7 },
        kluang: { name: 'Kluang', irradiance: 4.7 },
        muar: { name: 'Muar', irradiance: 4.7 },
        melaka: { name: 'Melaka', irradiance: 4.6 },
        johor: { name: 'Johor (Other Areas)', irradiance: 4.7 }
    };
    
    let charts = {
        monthly: null,
        energy: null,
        cumulative: null,
        roi: null
    };
    let latestCalculationId = 0;
    let latestCaptureToken = '';
    let latestUserEmail = '';
    
    $('#location').on('change', function() {
        const selectedLocation = $(this).val();
        if (selectedLocation && locationData[selectedLocation]) {
            const location = locationData[selectedLocation];
            $('#location-info').html(
                '<strong>Peak Sun Hours:</strong> ' + location.irradiance + ' hours/day<br>' +
                'This location receives strong solar irradiance for residential generation estimates.'
            ).slideDown(300);
        } else {
            $('#location-info').slideUp(300);
        }
    });
    
    $('#voltage-level').on('change', function() {
        const selectedVoltage = $(this).val();
        
        if (selectedVoltage === 'single_phase') {
            $('#voltage-info').html('Single-phase meter (230V, 4 terminals), capped at 4kWac solar system').slideDown(300);
        } else if (selectedVoltage === 'three_phase') {
            $('#voltage-info').html('Three-phase meter (415V, 8 terminals), capped at 10kWac solar system').slideDown(300);
        } else {
            $('#voltage-info').slideUp(300);
        }
    });
    
    $('#nem-calculator-form').on('submit', function(e) {
        e.preventDefault();
        
        const $button = $('.nem-calc-button');
        const originalText = $button.html();
        const formData = {
            action: 'nem_calculate',
            nonce: nemCalcSettings.nonce,
            tariff_group: 'tariff_a',
            user_email: $('#report-email').val(),
            monthly_bill: $('#monthly-bill').val(),
            mode_of_purchase: $('#mode-of-purchase').val(),
            solar_rate: 0,
            voltage_level: $('#voltage-level').val(),
            location: $('#location').val()
        };

        if (!formData.user_email) {
            showError('Enter your email so we can send you a copy of the estimate.');
            $('#report-email').focus();
            return;
        }

        if (!isValidEmail(formData.user_email)) {
            showError('Please check your email address before continuing.');
            $('#report-email').focus();
            return;
        }
        
        if (!formData.location) {
            showError('Choose your location so we can personalise the estimate.');
            $('#location').focus();
            return;
        }
        
        if (!formData.mode_of_purchase) {
            showError('Let us know how you plan to pay for the system.');
            $('#mode-of-purchase').focus();
            return;
        }
        
        if (!formData.voltage_level) {
            showError('Pick your voltage level so we can size the system correctly.');
            $('#voltage-level').focus();
            return;
        }
        
        if (!formData.monthly_bill || parseFloat(formData.monthly_bill) <= 0) {
            showError('Enter your average monthly bill to see an estimate.');
            $('#monthly-bill').focus();
            return;
        }
        
        if (parseFloat(formData.monthly_bill) > 100000) {
            showError('That bill amount looks unusually high. Please double-check it and try again.');
            $('#monthly-bill').focus();
            return;
        }
        
        $('.nem-calc-error').remove();
        latestCalculationId = 0;
        latestCaptureToken = '';
        latestUserEmail = formData.user_email;
        $button.addClass('loading').prop('disabled', true);
        $button.html('<span class="loading-spinner"></span> Putting your estimate together...');
        $('#calc-progress').addClass('active');
        $('#nem-calc-results').slideUp(300);
        
        $.ajax({
            url: nemCalcSettings.ajaxurl,
            type: 'POST',
            data: formData,
            success: function(response) {
                if (response && response.success) {
                    latestCalculationId = response.data.calculation_id || 0;
                    latestUserEmail = response.data.user_email || formData.user_email;
                    displayResults(response.data);
                } else {
                    const message = response && response.data && response.data.message
                        ? response.data.message
                        : 'We could not put the estimate together just yet. Please check your details and try again.';
                    showError(message);
                }
            },
            error: function(xhr) {
                let errorMsg = 'We hit a small issue while preparing your estimate. Please try again.';
                
                if (xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message) {
                    errorMsg = xhr.responseJSON.data.message;
                } else if (xhr.status === 0) {
                    errorMsg = 'It looks like your connection dropped for a moment. Please check it and try again.';
                } else if (xhr.status === 403) {
                    errorMsg = 'This page needs a quick refresh before we can continue.';
                } else if (xhr.status === 404) {
                    errorMsg = 'We could not reach the calculator service right now. Please try again in a moment.';
                } else if (xhr.status >= 500) {
                    errorMsg = 'Something went wrong on our side. Please try again in a moment.';
                }
                
                showError(errorMsg);
            },
            complete: function() {
                $button.removeClass('loading').prop('disabled', false).html(originalText);
                $('#calc-progress').removeClass('active');
            }
        });
    });
    
    $('#nem-lead-form').on('submit', function(e) {
        e.preventDefault();
        
        const $button = $('.nem-lead-button');
        const originalText = $button.text();
        const leadData = {
            action: 'nem_capture_lead',
            nonce: nemCalcSettings.nonce,
            calculation_id: $('#nem-calculation-id').val() || latestCalculationId,
            capture_token: $('#nem-capture-token').val() || latestCaptureToken,
            user_name: $('#user-name').val(),
            user_phone: $('#user-phone').val()
        };
        
        if (!leadData.calculation_id) {
            showError('Please view your estimate first, then share your contact details.');
            return;
        }
        
        if (!leadData.capture_token) {
            showError('Please refresh your estimate first, then try sending your details again.');
            return;
        }
        
        if (!leadData.user_name || !leadData.user_phone) {
            showError('Fill in your name and contact number so our team can reach you.');
            return;
        }
        
        $button.prop('disabled', true).text('Saving your details...');
        
        $.ajax({
            url: nemCalcSettings.ajaxurl,
            type: 'POST',
            data: leadData,
            success: function(response) {
                if (response && response.success) {
                    showSuccess(response.data.message || 'Thanks, we have your details and will be in touch soon.');
                    latestCaptureToken = '';
                    $('#nem-capture-token').val('');
                    $('#nem-lead-form').slideUp(200);
                } else {
                    const message = response && response.data && response.data.message
                        ? response.data.message
                        : 'We could not save your details just yet. Please try again.';
                    showError(message);
                }
            },
            error: function(xhr) {
                let message = 'We could not save your details just yet. Please try again.';
                if (xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message) {
                    message = xhr.responseJSON.data.message;
                }
                showError(message);
            },
            complete: function() {
                $button.prop('disabled', false).text(originalText);
            }
        });
    });
    
    function displayResults(data) {
        Object.keys(charts).forEach(function(key) {
            if (charts[key]) {
                try {
                    charts[key].destroy();
                } catch (error) {
                    charts[key] = null;
                }
            }
        });
        
        const summaryHtml = `
            <div class="summary-card">
                <div class="card-label">System Capacity</div>
                <div class="card-value">${data.system_capacity}<span class="card-unit">kWac</span></div>
                <div class="card-subtext">${data.location_name}</div>
            </div>
            <div class="summary-card">
                <div class="card-label">Monthly Generation</div>
                <div class="card-value">${data.monthly_generation.toLocaleString()}<span class="card-unit">kWh</span></div>
                <div class="card-subtext">Peak sun: ${data.peak_sun_hours} hrs/day</div>
            </div>
            <div class="summary-card">
                <div class="card-label">Monthly Savings</div>
                <div class="card-value">RM ${data.monthly_savings.toLocaleString()}</div>
                <div class="card-subtext">RM ${data.annual_savings.toLocaleString()}/year</div>
            </div>
            <div class="summary-card">
                <div class="card-label">Payback Period</div>
                <div class="card-value">${data.payback_period}<span class="card-unit">years</span></div>
                <div class="card-subtext">25-year savings: RM ${data.lifetime_savings.toLocaleString()}</div>
            </div>
        `;
        $('#results-summary').html(summaryHtml);
        
        if (data.nem_rates) {
            $('#nem-rate-info').show();
            $('#import-rate-display').text('RM ' + data.nem_rates.import_rate.toFixed(4) + '/kWh');
            $('#export-rate-display').text('RM ' + data.nem_rates.export_rate.toFixed(4) + '/kWh');
            $('#price-gap-display').text('RM ' + data.nem_rates.price_gap.toFixed(4));
            $('#self-consumption-display').text(data.self_consumption.toLocaleString() + ' kWh/month');
            $('#export-amount-display').text(data.export_to_grid.toLocaleString() + ' kWh/month');
        }
        
        if ($('#nem-post-results-lead').length) {
            latestCaptureToken = data.capture_token || '';
            latestUserEmail = data.user_email || latestUserEmail;
            $('#nem-calculation-id').val(data.calculation_id || latestCalculationId || '');
            $('#nem-capture-token').val(latestCaptureToken);
            $('#nem-report-email-display').text(latestUserEmail || '-');
            if ((data.calculation_id || latestCalculationId) && latestCaptureToken) {
                $('#user-name').val('');
                $('#user-phone').val('');
                $('#nem-post-results-lead').slideDown(300);
                $('#nem-lead-form').show();
            } else {
                $('#nem-post-results-lead').hide();
            }
        }
        
        displayComparisonTable(data);
        
        $('.charts-section .nem-calc-error').remove();
        if (typeof Chart !== 'undefined') {
            try {
                createMonthlySavingsChart(data);
                createEnergyComparisonChart(data);
                createCumulativeSavingsChart(data);
                createROIChart(data);
            } catch (error) {
                $('.charts-section').prepend('<div class="nem-calc-error">Charts could not be loaded. Your results are still valid above.</div>');
            }
        } else {
            $('.charts-section').prepend('<div class="nem-calc-error">Charts require internet access. Your results are still valid above.</div>');
        }

        if (data.email_message) {
            showResultsNotice(data.email_message, data.email_status === 'sent' ? 'success' : 'error');
        }
        
        $('#nem-calc-results').slideDown(400);
        $('html, body').animate({
            scrollTop: $('#nem-calc-results').offset().top - 100
        }, 500);
    }
    
    function displayComparisonTable(data) {
        const withoutSolarMonthly = parseFloat(data.monthly_bill) || (data.monthly_consumption * data.energy_rate);
        const withSolarMonthly = withoutSolarMonthly - parseFloat(data.monthly_savings);
        const withoutSolarAnnual = withoutSolarMonthly * 12;
        const withSolarAnnual = withSolarMonthly * 12;
        const withoutSolar25Year = withoutSolarAnnual * 25;
        const withSolar25Year = withSolarAnnual * 25;
        
        const tableHtml = `
            <tr class="scenario-without">
                <td data-label="Scenario"><strong>Without Solar</strong></td>
                <td data-label="Monthly Cost">RM ${withoutSolarMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td data-label="Annual Cost">RM ${withoutSolarAnnual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td data-label="25-Year Total">RM ${withoutSolar25Year.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr class="scenario-with">
                <td data-label="Scenario"><strong>With Solar (NEM)</strong></td>
                <td data-label="Monthly Cost">RM ${withSolarMonthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td data-label="Annual Cost">RM ${withSolarAnnual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td data-label="25-Year Total">RM ${withSolar25Year.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr class="savings-highlight">
                <td data-label="Scenario"><strong>Total Savings</strong></td>
                <td data-label="Monthly Savings">RM ${data.monthly_savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td data-label="Annual Savings">RM ${data.annual_savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td data-label="25-Year Savings">RM ${data.lifetime_savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
        `;
        
        $('#comparison-tbody').html(tableHtml);
    }
    
    function createMonthlySavingsChart(data) {
        const ctx = document.getElementById('monthly-savings-chart').getContext('2d');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        charts.monthly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Monthly Savings (RM)',
                    data: data.monthly_breakdown.map(function(month) { return month.savings; }),
                    backgroundColor: createGradient(ctx, nemCalcSettings.colors.primary, nemCalcSettings.colors.secondary),
                    borderColor: nemCalcSettings.colors.primary,
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: function(context) {
                                return 'Savings: RM ' + context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 });
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'RM ' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
    
    function createEnergyComparisonChart(data) {
        const ctx = document.getElementById('energy-comparison-chart').getContext('2d');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        charts.energy = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Solar Generation (kWh)',
                    data: data.monthly_breakdown.map(function(month) { return month.generation; }),
                    borderColor: nemCalcSettings.colors.primary,
                    backgroundColor: hexToRGBA(nemCalcSettings.colors.primary, 0.1),
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Monthly Consumption (kWh)',
                    data: data.monthly_breakdown.map(function(month) { return month.consumption; }),
                    borderColor: nemCalcSettings.colors.accent,
                    backgroundColor: hexToRGBA(nemCalcSettings.colors.accent, 0.1),
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + ' kWh';
                            }
                        }
                    }
                }
            }
        });
    }
    
    function createCumulativeSavingsChart(data) {
        const ctx = document.getElementById('cumulative-savings-chart').getContext('2d');
        
        charts.cumulative = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.year_projections.map(function(year) { return 'Year ' + year.year; }),
                datasets: [{
                    label: 'Cumulative Savings (RM)',
                    data: data.year_projections.map(function(year) { return year.cumulative_savings; }),
                    borderColor: nemCalcSettings.colors.secondary,
                    backgroundColor: createGradient(ctx, nemCalcSettings.colors.primary, nemCalcSettings.colors.accent, true),
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                return 'Total Savings: RM ' + context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 });
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'RM ' + (value / 1000).toFixed(0) + 'k';
                            }
                        }
                    }
                }
            }
        });
    }
    
    function createROIChart(data) {
        const ctx = document.getElementById('roi-chart').getContext('2d');
        
        charts.roi = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.year_projections.map(function(year) { return 'Year ' + year.year; }),
                datasets: [{
                    label: 'Return on Investment (%)',
                    data: data.year_projections.map(function(year) { return year.roi; }),
                    borderColor: nemCalcSettings.colors.accent,
                    backgroundColor: hexToRGBA(nemCalcSettings.colors.accent, 0.2),
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                return 'ROI: ' + context.parsed.y.toFixed(1) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    function createGradient(ctx, color1, color2, vertical) {
        const gradient = vertical
            ? ctx.createLinearGradient(0, 0, 0, 400)
            : ctx.createLinearGradient(0, 0, 400, 0);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        return gradient;
    }
    
    function hexToRGBA(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function showError(message) {
        $('.nem-calc-success, .nem-calc-error').remove();
        
        const errorHtml = '<div class="nem-calc-error">' + message + '</div>';
        $('#nem-calculator-form').prepend(errorHtml);
        
        $('html, body').animate({
            scrollTop: $('.nem-calc-error').offset().top - 100
        }, 300);
    }
    
    function showSuccess(message) {
        showResultsNotice(message, 'success');
    }

    function showResultsNotice(message, type) {
        $('.nem-calc-success, .nem-calc-error').remove();
        const noticeClass = type === 'error' ? 'nem-calc-error' : 'nem-calc-success';
        $('#nem-calc-results').prepend('<div class="' + noticeClass + '">' + message + '</div>');
    }
    
    $('.nem-calculator-wrapper').css('opacity', 0).animate({ opacity: 1 }, 600);
});
