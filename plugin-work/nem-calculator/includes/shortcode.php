<?php
/**
 * Shortcode Handler
 */

add_shortcode('nem_calculator', 'nem_calculator_shortcode');

function nem_calculator_shortcode($atts) {
    $settings = get_option('nem_calculator_settings', array());
    $calculator = new NEM_Calculator();
    $solar_locations = $calculator->get_solar_locations();
    
    ob_start();
    ?>
    <div class="nem-calculator-container">
        <div class="nem-calculator-wrapper">
            <h1 class="nem-calc-title">Solana Tec Smart Solar Calculator</h1>
            <p class="nem-calc-intro">
                Domestic Tariff A estimates for homes in Johor and Melaka using the latest February 2026 NEM/ATAP rates. Start with your email and we will send your Solar Assessment report there once your estimate is ready.
            </p>
            
            <form id="nem-calculator-form" class="nem-calc-form">
                <div class="nem-calc-row">
                    <div class="nem-calc-field">
                        <label for="report-email">
                            Email Address
                            <span class="help-icon" data-tooltip="We will email your Solar Assessment report to this address and keep it with your enquiry details.">?</span>
                        </label>
                        <input type="email" id="report-email" name="user_email" required placeholder="you@example.com">
                        <div class="nem-email-note">Your Solar Assessment report will be emailed to this address after the estimate is ready.</div>
                    </div>
                </div>

                <div class="nem-calc-row">
                    <div class="nem-calc-field">
                        <label for="monthly-bill">
                            Average Electricity Bill Monthly (RM)
                            <span class="help-icon" data-tooltip="Enter your average monthly TNB electricity bill in Ringgit Malaysia. For best accuracy, average your last 6 to 12 months of bills and exclude one-off charges.">?</span>
                        </label>
                        <div class="input-group">
                            <input type="number" id="monthly-bill" name="monthly_bill" step="0.01" min="0" required placeholder="e.g., 350">
                            <span class="input-prefix">RM</span>
                        </div>
                    </div>
                </div>
                
                <div class="nem-calc-row">
                    <div class="nem-calc-field" id="location-field">
                        <label for="location">
                            Location
                            <span class="help-icon" data-tooltip="Choose the closest supported location so the calculator can estimate solar generation using local irradiance data.">?</span>
                        </label>
                        <select id="location" name="location" required>
                            <option value="">Select Location</option>
                            <?php foreach ($solar_locations as $key => $loc): ?>
                                <option value="<?php echo esc_attr($key); ?>"><?php echo esc_html($loc['name']); ?></option>
                            <?php endforeach; ?>
                        </select>
                        <div id="location-info" class="info-text" style="display: none;"></div>
                    </div>
                    
                    <div class="nem-calc-field">
                        <label for="mode-of-purchase">
                            Preferred Payment Method
                            <span class="help-icon" data-tooltip="Choose how you expect to pay for the system. Current estimates use the same solar-cost assumption for all payment methods.">?</span>
                        </label>
                        <select id="mode-of-purchase" name="mode_of_purchase" required>
                            <option value="">Select Payment Method</option>
                            <option value="cash">Cash</option>
                            <option value="loan">Loan</option>
                            <option value="credit_installment">Credit Installment</option>
                        </select>
                    </div>
                </div>
                
                <div class="nem-calc-row">
                    <div class="nem-calc-field" id="voltage-level-field">
                        <label for="voltage-level">
                            Voltage Level
                            <span class="help-icon" data-tooltip="Single Phase (230V) usually supports up to 4kWac. Three Phase (415V) usually supports up to 10kWac. Check your TNB bill or meter if you are unsure.">?</span>
                        </label>
                        <select id="voltage-level" name="voltage_level" required>
                            <option value="">Select Voltage Level</option>
                            <option value="single_phase">Single Phase (Max: 4kWac)</option>
                            <option value="three_phase">Three Phase (Max: 10kWac)</option>
                        </select>
                        <div id="voltage-info" class="info-text"></div>
                    </div>
                </div>
                
                <div class="nem-calc-button-wrapper">
                    <button type="submit" class="nem-calc-button">
                        See My Estimate
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                
                <div class="nem-calc-progress" id="calc-progress">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-text">We are putting your estimate together...</div>
                </div>
            </form>
            
            <div id="nem-calc-results" class="nem-calc-results" style="display: none;">
                <h2>Your Solar Estimate</h2>
                
                <div id="results-summary"></div>
                
                <div class="nem-rate-info-section" id="nem-rate-info" style="display: none;">
                    <h3>NEM/ATAP Rate Structure (February 2026)</h3>
                    <div class="rate-info-grid">
                        <div class="rate-card import-rate">
                            <h4>Import Rate (Buying from Grid)</h4>
                            <div class="rate-breakdown">
                                <div class="rate-line">
                                    <span>Energy Charge:</span>
                                    <strong>RM 0.3703/kWh</strong>
                                </div>
                                <div class="rate-line">
                                    <span>Capacity Charge:</span>
                                    <strong>RM 0.0455/kWh</strong>
                                </div>
                                <div class="rate-line">
                                    <span>Network Charge:</span>
                                    <strong>RM 0.1285/kWh</strong>
                                </div>
                                <div class="rate-line rebate">
                                    <span>Forecast AFA (Rebate):</span>
                                    <strong>-RM 0.0499/kWh</strong>
                                </div>
                                <div class="rate-line total">
                                    <span>Total Import Rate:</span>
                                    <strong id="import-rate-display">RM 0.4944/kWh</strong>
                                </div>
                            </div>
                        </div>
                        
                        <div class="rate-card export-rate">
                            <h4>Export Rate (Selling to TNB)</h4>
                            <div class="rate-value">
                                <span class="label">Offset Rate:</span>
                                <span class="value" id="export-rate-display">RM 0.3700/kWh</span>
                                <small>(Energy Charge only)</small>
                            </div>
                        </div>
                        
                        <div class="rate-card price-gap">
                            <h4>The Price Gap</h4>
                            <p class="gap-explanation">
                                Every kWh exported earns <strong>RM 0.37</strong><br>
                                Every kWh imported costs <strong>RM 0.49</strong><br>
                                <span class="loss">You lose <strong id="price-gap-display">RM 0.12</strong> per kWh</span>
                            </p>
                            <p class="recommendation">
                                <strong>Battery Storage Recommended:</strong> Store excess solar instead of exporting to maximize savings.
                            </p>
                        </div>
                    </div>
                    
                    <div class="energy-flow" id="energy-flow-info">
                        <h4>Your Energy Flow</h4>
                        <div class="flow-stats">
                            <div class="flow-stat">
                                <span class="flow-label">Self-Consumed:</span>
                                <span class="flow-value" id="self-consumption-display">0 kWh/month</span>
                                <small>Saved at RM 0.49/kWh</small>
                            </div>
                            <div class="flow-stat">
                                <span class="flow-label">Exported to Grid:</span>
                                <span class="flow-value" id="export-amount-display">0 kWh/month</span>
                                <small>Earned at RM 0.37/kWh</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="comparison-section">
                    <h3>With Solar vs Without Solar</h3>
                    <p class="section-description">A quick side-by-side look at how your monthly, yearly, and long-term costs may change with solar.</p>
                    <div class="comparison-table-wrapper">
                        <table class="comparison-table" id="comparison-table">
                            <thead>
                                <tr>
                                    <th>Scenario</th>
                                    <th>Monthly Cost</th>
                                    <th>Annual Cost</th>
                                    <th>25-Year Total</th>
                                </tr>
                            </thead>
                            <tbody id="comparison-tbody"></tbody>
                        </table>
                    </div>
                </div>
                
                <div class="charts-section">
                    <div class="chart-container">
                        <h3>Monthly Savings Projection (Year 1)</h3>
                        <p class="chart-description">This bar chart shows how much you could save each month across the first year.</p>
                        <canvas id="monthly-savings-chart"></canvas>
                    </div>
                    
                    <div class="chart-container">
                        <h3>Energy Generation vs Consumption</h3>
                        <p class="chart-description">This compares your estimated solar production with your monthly electricity usage.</p>
                        <canvas id="energy-comparison-chart"></canvas>
                    </div>
                    
                    <div class="chart-container">
                        <h3>25-Year Cumulative Savings</h3>
                        <p class="chart-description">This chart shows how your estimated savings may build up over the long term.</p>
                        <canvas id="cumulative-savings-chart"></canvas>
                    </div>
                    
                    <div class="chart-container">
                        <h3>Return on Investment Timeline</h3>
                        <p class="chart-description">This gives a simple view of how your return may grow over time.</p>
                        <canvas id="roi-chart"></canvas>
                    </div>
                </div>
                
                <?php if (isset($settings['enable_lead_capture']) && $settings['enable_lead_capture']): ?>
                <div class="nem-calc-lead-capture post-results" id="nem-post-results-lead" style="display: none;">
                    <h3><?php echo esc_html(isset($settings['lead_capture_heading']) ? $settings['lead_capture_heading'] : 'Want us to walk you through it?'); ?></h3>
                    <p><?php echo esc_html(isset($settings['lead_capture_description']) ? $settings['lead_capture_description'] : 'Leave your name and contact number so the Solana Tec team can follow up with a more personalised recommendation.'); ?></p>
                    <div class="nem-email-confirmation">
                        <span>Estimate email:</span>
                        <strong id="nem-report-email-display">-</strong>
                    </div>
                    
                    <form id="nem-lead-form" class="nem-lead-form">
                        <input type="hidden" id="nem-calculation-id" value="">
                        <input type="hidden" id="nem-capture-token" value="">
                        
                        <div class="nem-calc-row">
                            <div class="nem-calc-field">
                                <label for="user-name">Name</label>
                                <input type="text" id="user-name" name="user_name" placeholder="Your name" required>
                            </div>
                        </div>
                        
                        <div class="nem-calc-row">
                            <div class="nem-calc-field">
                                <label for="user-phone">Contact Number</label>
                                <input type="tel" id="user-phone" name="user_phone" placeholder="+60 12-345 6789" required>
                            </div>
                        </div>
                        
                        <div class="nem-calc-button-wrapper lead-submit">
                            <button type="submit" class="nem-calc-button nem-lead-button">Save My Contact Details</button>
                        </div>
                    </form>
                </div>
                <?php endif; ?>
                
                <?php if (isset($settings['enable_cta_button']) && $settings['enable_cta_button']): ?>
                <div class="nem-calc-cta">
                    <h3><?php echo esc_html(isset($settings['cta_heading']) ? $settings['cta_heading'] : 'Ready to Start Saving?'); ?></h3>
                    <?php if (isset($settings['cta_description']) && !empty($settings['cta_description'])): ?>
                    <p><?php echo esc_html($settings['cta_description']); ?></p>
                    <?php endif; ?>
                    
                    <a href="<?php echo esc_url(isset($settings['cta_button_url']) ? $settings['cta_button_url'] : '#'); ?>"
                       class="nem-cta-button <?php echo (isset($settings['cta_button_style']) && $settings['cta_button_style'] === 'custom') ? 'custom-style' : ''; ?>"
                       target="_blank"
                       rel="noopener noreferrer">
                        <?php if (!isset($settings['cta_button_style']) || $settings['cta_button_style'] === 'whatsapp'): ?>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        <?php endif; ?>
                        <?php echo esc_html(isset($settings['cta_button_text']) ? $settings['cta_button_text'] : 'Contact Us for Free Quote'); ?>
                    </a>
                </div>
                <?php endif; ?>
            </div>
            
            <div class="nem-calc-disclaimer">
                <strong>Disclaimer:</strong> This calculator provides estimates based on the information provided. Actual results may vary. Please consult with Solana Tec team for accurate assessments.
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
