<?php
/**
 * NEM Calculator Dashboard
 */

// Dashboard page
function nem_calculator_dashboard_page() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'nem_calculations';
    
    // Get statistics
    $total_calculations = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
    $today_calculations = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $table_name WHERE DATE(created_at) = %s",
        current_time('Y-m-d')
    ));
    $week_calculations = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $table_name WHERE created_at >= %s",
        date('Y-m-d', strtotime('-7 days'))
    ));
    $month_calculations = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $table_name WHERE created_at >= %s",
        date('Y-m-d', strtotime('-30 days'))
    ));
    
    // Get average savings
    $avg_monthly_savings = $wpdb->get_var("SELECT AVG(monthly_savings) FROM $table_name");
    $avg_annual_savings = $wpdb->get_var("SELECT AVG(annual_savings) FROM $table_name");
    $total_lifetime_savings = $wpdb->get_var("SELECT SUM(lifetime_savings) FROM $table_name");
    
    // Get average system capacity
    $avg_system_capacity = $wpdb->get_var("SELECT AVG(system_capacity) FROM $table_name");
    
    // Get top locations
    $top_locations = $wpdb->get_results(
        "SELECT location, COUNT(*) as count FROM $table_name GROUP BY location ORDER BY count DESC LIMIT 5"
    );
    
    // Get recent calculations
    $recent_calculations = $wpdb->get_results(
        "SELECT * FROM $table_name ORDER BY created_at DESC LIMIT 10"
    );
    
    // Get daily stats for chart (last 30 days)
    $daily_stats = $wpdb->get_results($wpdb->prepare(
        "SELECT DATE(created_at) as date, COUNT(*) as count, AVG(monthly_savings) as avg_savings 
         FROM $table_name 
         WHERE created_at >= %s 
         GROUP BY DATE(created_at) 
         ORDER BY date ASC",
        date('Y-m-d', strtotime('-30 days'))
    ));
    
    // Get leads statistics
    $total_leads = $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE user_email IS NOT NULL");
    $new_leads = $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE lead_status = 'new' AND user_email IS NOT NULL");
    $contacted_leads = $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE lead_status = 'contacted' AND user_email IS NOT NULL");
    $converted_leads = $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE lead_status = 'converted' AND user_email IS NOT NULL");
    
    // Calculate conversion rate
    $conversion_rate = ($total_calculations > 0) ? ($total_leads / $total_calculations) * 100 : 0;
    
    ?>
    <div class="wrap nem-dashboard">
        <h1>
            <span class="dashicons dashicons-chart-area" style="font-size: 30px; margin-right: 10px;"></span>
            NEM Calculator Dashboard
        </h1>
        
        <!-- Summary Cards -->
        <div class="nem-stats-grid">
            <div class="nem-stat-card">
                <div class="nem-stat-icon" style="background: linear-gradient(135deg, #00D4FF, #8B5CF6);">
                    <span class="dashicons dashicons-calculator"></span>
                </div>
                <div class="nem-stat-content">
                    <h3>Total Calculations</h3>
                    <p class="nem-stat-number"><?php echo number_format($total_calculations); ?></p>
                    <span class="nem-stat-meta">
                        <strong><?php echo number_format($today_calculations); ?></strong> today | 
                        <strong><?php echo number_format($week_calculations); ?></strong> this week
                    </span>
                </div>
            </div>
            
            <div class="nem-stat-card">
                <div class="nem-stat-icon" style="background: linear-gradient(135deg, #10B981, #059669);">
                    <span class="dashicons dashicons-money-alt"></span>
                </div>
                <div class="nem-stat-content">
                    <h3>Average Monthly Savings</h3>
                    <p class="nem-stat-number">RM <?php echo number_format($avg_monthly_savings, 2); ?></p>
                    <span class="nem-stat-meta">
                        Annual: <strong>RM <?php echo number_format($avg_annual_savings, 2); ?></strong>
                    </span>
                </div>
            </div>
            
            <div class="nem-stat-card">
                <div class="nem-stat-icon" style="background: linear-gradient(135deg, #F59E0B, #D97706);">
                    <span class="dashicons dashicons-admin-users"></span>
                </div>
                <div class="nem-stat-content">
                    <h3>Total Leads Captured</h3>
                    <p class="nem-stat-number"><?php echo number_format($total_leads); ?></p>
                    <span class="nem-stat-meta">
                        Conversion Rate: <strong><?php echo number_format($conversion_rate, 1); ?>%</strong>
                    </span>
                </div>
            </div>
            
            <div class="nem-stat-card">
                <div class="nem-stat-icon" style="background: linear-gradient(135deg, #EC4899, #BE185D);">
                    <span class="dashicons dashicons-star-filled"></span>
                </div>
                <div class="nem-stat-content">
                    <h3>Avg System Capacity</h3>
                    <p class="nem-stat-number"><?php echo number_format($avg_system_capacity, 1); ?> kWac</p>
                    <span class="nem-stat-meta">
                        Total Potential: <strong>RM <?php echo number_format($total_lifetime_savings / 1000000, 2); ?>M</strong>
                    </span>
                </div>
            </div>
        </div>
        
        <!-- Charts Row -->
        <div class="nem-charts-row">
            <div class="nem-chart-container">
                <h2>Calculations Trend (Last 30 Days)</h2>
                <canvas id="calculations-trend-chart"></canvas>
            </div>
            
            <div class="nem-chart-container">
                <h2>Lead Status Overview</h2>
                <canvas id="lead-status-chart"></canvas>
            </div>
        </div>
        
        <!-- Top Stats Row -->
        <div class="nem-top-stats-row">
            <div class="nem-top-stat-box">
                <h3>Calculator Scope</h3>
                <div class="nem-scope-list">
                    <p><strong>Tariff:</strong> Domestic Tariff A only</p>
                    <p><strong>Voltage:</strong> Single Phase or Three Phase</p>
                    <p><strong>Payments:</strong> Cash, Loan, Credit Installment</p>
                    <p><strong>Coverage:</strong> Johor and Melaka locations</p>
                </div>
            </div>
            
            <div class="nem-top-stat-box">
                <h3>Top Locations</h3>
                <table class="nem-mini-table">
                    <thead>
                        <tr>
                            <th>Location</th>
                            <th>Calculations</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($top_locations as $location): ?>
                        <tr>
                            <td><strong><?php echo esc_html(ucwords(str_replace('_', ' ', $location->location))); ?></strong></td>
                            <td><?php echo number_format($location->count); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
            <div class="nem-top-stat-box" style="grid-column: span 2;">
                <h3>Quick Stats</h3>
                <div class="nem-quick-stats">
                    <div class="nem-quick-stat">
                        <span class="dashicons dashicons-calendar-alt"></span>
                        <div>
                            <strong><?php echo number_format($month_calculations); ?></strong>
                            <span>This Month</span>
                        </div>
                    </div>
                    <div class="nem-quick-stat">
                        <span class="dashicons dashicons-groups"></span>
                        <div>
                            <strong><?php echo number_format($new_leads); ?></strong>
                            <span>New Leads</span>
                        </div>
                    </div>
                    <div class="nem-quick-stat">
                        <span class="dashicons dashicons-phone"></span>
                        <div>
                            <strong><?php echo number_format($contacted_leads); ?></strong>
                            <span>Contacted</span>
                        </div>
                    </div>
                    <div class="nem-quick-stat">
                        <span class="dashicons dashicons-yes-alt"></span>
                        <div>
                            <strong><?php echo number_format($converted_leads); ?></strong>
                            <span>Converted</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Recent Calculations -->
        <div class="nem-recent-section">
            <h2>Recent Calculations</h2>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Contact</th>
                        <th>Voltage</th>
                        <th>Location</th>
                        <th>System</th>
                        <th>Monthly Savings</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($recent_calculations)): ?>
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 30px;">
                            <p style="color: #666;">No calculations yet. Share your calculator to start collecting data!</p>
                        </td>
                    </tr>
                    <?php else: ?>
                        <?php foreach ($recent_calculations as $calc): ?>
                        <tr>
                            <td><?php echo date('M d, Y H:i', strtotime($calc->created_at)); ?></td>
                            <td>
                                <?php if ($calc->user_email): ?>
                                    <strong><?php echo esc_html($calc->user_name ?: 'N/A'); ?></strong><br>
                                    <a href="mailto:<?php echo esc_attr($calc->user_email); ?>"><?php echo esc_html($calc->user_email); ?></a>
                                <?php else: ?>
                                    <em>Anonymous</em>
                                <?php endif; ?>
                            </td>
                            <td><?php echo esc_html($calc->voltage_level === 'single_phase' ? 'Single Phase' : 'Three Phase'); ?></td>
                            <td><?php echo esc_html(ucwords(str_replace('_', ' ', $calc->location))); ?></td>
                            <td><?php echo number_format($calc->system_capacity, 1); ?> kWac</td>
                            <td><strong>RM <?php echo number_format($calc->monthly_savings, 2); ?></strong></td>
                            <td>
                                <span class="nem-status-badge nem-status-<?php echo esc_attr($calc->lead_status); ?>">
                                    <?php echo esc_html(ucfirst($calc->lead_status)); ?>
                                </span>
                            </td>
                            <td>
                                <a href="<?php echo admin_url('admin.php?page=nem-calculator-leads&action=view&id=' . $calc->id); ?>" class="button button-small">View</a>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
            
            <?php if (!empty($recent_calculations)): ?>
            <p style="text-align: center; margin-top: 20px;">
                <a href="<?php echo admin_url('admin.php?page=nem-calculator-leads'); ?>" class="button button-primary button-large">
                    View All Leads →
                </a>
            </p>
            <?php endif; ?>
        </div>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        // Calculations Trend Chart
        const trendCtx = document.getElementById('calculations-trend-chart').getContext('2d');
        const trendData = <?php echo json_encode($daily_stats); ?>;
        
        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: trendData.map(d => d.date),
                datasets: [{
                    label: 'Calculations',
                    data: trendData.map(d => d.count),
                    borderColor: '#00D4FF',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        
        // Lead Status Chart
        const statusCtx = document.getElementById('lead-status-chart').getContext('2d');
        new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['New', 'Contacted', 'Converted'],
                datasets: [{
                    data: [<?php echo $new_leads; ?>, <?php echo $contacted_leads; ?>, <?php echo $converted_leads; ?>],
                    backgroundColor: ['#F59E0B', '#00D4FF', '#10B981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    });
    </script>
    
    <style>
    .nem-dashboard {
        margin: 20px 20px 20px 0;
    }
    
    .nem-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin: 30px 0;
    }
    
    .nem-stat-card {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        display: flex;
        gap: 15px;
        align-items: flex-start;
    }
    
    .nem-stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 30px;
    }
    
    .nem-stat-content h3 {
        margin: 0 0 5px 0;
        font-size: 14px;
        color: #666;
        font-weight: 600;
    }
    
    .nem-stat-number {
        margin: 5px 0;
        font-size: 28px;
        font-weight: 700;
        color: #1e293b;
    }
    
    .nem-stat-meta {
        font-size: 13px;
        color: #64748b;
    }
    
    .nem-charts-row {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 20px;
        margin: 30px 0;
    }
    
    .nem-chart-container {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .nem-chart-container h2 {
        margin: 0 0 20px 0;
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
    }
    
    .nem-chart-container canvas {
        max-height: 250px;
    }
    
    .nem-top-stats-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        margin: 30px 0;
    }
    
    .nem-top-stat-box {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .nem-top-stat-box h3 {
        margin: 0 0 15px 0;
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
        padding-bottom: 10px;
        border-bottom: 2px solid #f1f5f9;
    }
    
    .nem-mini-table {
        width: 100%;
        font-size: 13px;
    }
    
    .nem-mini-table th {
        text-align: left;
        padding: 8px 0;
        color: #64748b;
        font-weight: 600;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .nem-mini-table td {
        padding: 10px 0;
        border-bottom: 1px solid #f1f5f9;
    }
    
    .nem-scope-list p {
        margin: 0 0 12px 0;
        color: #475569;
    }
    
    .nem-quick-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
    }
    
    .nem-quick-stat {
        text-align: center;
        padding: 15px;
        background: #f8fafc;
        border-radius: 8px;
    }
    
    .nem-quick-stat .dashicons {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: #00D4FF;
    }
    
    .nem-quick-stat strong {
        display: block;
        font-size: 24px;
        font-weight: 700;
        color: #1e293b;
        margin: 5px 0;
    }
    
    .nem-quick-stat span {
        display: block;
        font-size: 12px;
        color: #64748b;
    }
    
    .nem-recent-section {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin: 30px 0;
    }
    
    .nem-recent-section h2 {
        margin: 0 0 20px 0;
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
    }
    
    .nem-status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .nem-status-new {
        background: #FEF3C7;
        color: #92400E;
    }
    
    .nem-status-contacted {
        background: #DBEAFE;
        color: #1E40AF;
    }
    
    .nem-status-converted {
        background: #D1FAE5;
        color: #065F46;
    }
    </style>
    <?php
}
