<?php
/**
 * NEM Calculator Lead Management
 */

// Leads management page
function nem_calculator_leads_page() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'nem_calculations';
    
    // Handle actions
    if (isset($_POST['nem_update_lead'])) {
        check_admin_referer('nem_update_lead');
        
        $id = intval($_POST['lead_id']);
        $status = sanitize_text_field($_POST['lead_status']);
        $notes = sanitize_textarea_field($_POST['admin_notes']);
        
        $wpdb->update(
            $table_name,
            array(
                'lead_status' => $status,
                'admin_notes' => $notes
            ),
            array('id' => $id),
            array('%s', '%s'),
            array('%d')
        );
        
        echo '<div class="notice notice-success"><p>Lead updated successfully!</p></div>';
    }
    
    if (isset($_GET['action']) && $_GET['action'] === 'delete' && isset($_GET['id'])) {
        check_admin_referer('nem_delete_lead_' . $_GET['id']);
        $wpdb->delete($table_name, array('id' => intval($_GET['id'])), array('%d'));
        echo '<div class="notice notice-success"><p>Lead deleted successfully!</p></div>';
    }
    
    // Export to CSV
    if (isset($_GET['action']) && $_GET['action'] === 'export') {
        nem_calculator_export_leads();
        exit;
    }
    
    // View single lead
    if (isset($_GET['action']) && $_GET['action'] === 'view' && isset($_GET['id'])) {
        nem_calculator_view_lead(intval($_GET['id']));
        return;
    }
    
    // Filters
    $status_filter = isset($_GET['status']) ? sanitize_text_field($_GET['status']) : '';
    $search = isset($_GET['s']) ? sanitize_text_field($_GET['s']) : '';
    $date_from = isset($_GET['date_from']) ? sanitize_text_field($_GET['date_from']) : '';
    $date_to = isset($_GET['date_to']) ? sanitize_text_field($_GET['date_to']) : '';
    
    // Build query
    $where = array('1=1');
    if ($status_filter) {
        $where[] = $wpdb->prepare('lead_status = %s', $status_filter);
    }
    if ($search) {
        $where[] = $wpdb->prepare('(user_email LIKE %s OR user_name LIKE %s OR user_phone LIKE %s)', 
            '%' . $wpdb->esc_like($search) . '%',
            '%' . $wpdb->esc_like($search) . '%',
            '%' . $wpdb->esc_like($search) . '%'
        );
    }
    if ($date_from) {
        $where[] = $wpdb->prepare('DATE(created_at) >= %s', $date_from);
    }
    if ($date_to) {
        $where[] = $wpdb->prepare('DATE(created_at) <= %s', $date_to);
    }
    
    $where_clause = implode(' AND ', $where);
    
    // Pagination
    $per_page = 20;
    $current_page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
    $offset = ($current_page - 1) * $per_page;
    
    $total_leads = $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE $where_clause");
    $total_pages = ceil($total_leads / $per_page);
    
    $leads = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table_name WHERE $where_clause ORDER BY created_at DESC LIMIT %d OFFSET %d",
        $per_page,
        $offset
    ));
    
    // Get status counts
    $status_counts = array(
        'all' => $wpdb->get_var("SELECT COUNT(*) FROM $table_name"),
        'new' => $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE lead_status = 'new'"),
        'contacted' => $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE lead_status = 'contacted'"),
        'qualified' => $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE lead_status = 'qualified'"),
        'converted' => $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE lead_status = 'converted'"),
        'lost' => $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE lead_status = 'lost'")
    );
    
    ?>
    <div class="wrap nem-leads-page">
        <h1>
            <span class="dashicons dashicons-groups" style="font-size: 30px; margin-right: 10px;"></span>
            Lead Management
            <a href="<?php echo admin_url('admin.php?page=nem-calculator-leads&action=export'); ?>" class="page-title-action">
                <span class="dashicons dashicons-download"></span> Export to CSV
            </a>
        </h1>
        
        <!-- Status Filters -->
        <ul class="subsubsub">
            <li>
                <a href="<?php echo admin_url('admin.php?page=nem-calculator-leads'); ?>" <?php echo empty($status_filter) ? 'class="current"' : ''; ?>>
                    All <span class="count">(<?php echo $status_counts['all']; ?>)</span>
                </a> |
            </li>
            <li>
                <a href="<?php echo admin_url('admin.php?page=nem-calculator-leads&status=new'); ?>" <?php echo $status_filter === 'new' ? 'class="current"' : ''; ?>>
                    New <span class="count">(<?php echo $status_counts['new']; ?>)</span>
                </a> |
            </li>
            <li>
                <a href="<?php echo admin_url('admin.php?page=nem-calculator-leads&status=contacted'); ?>" <?php echo $status_filter === 'contacted' ? 'class="current"' : ''; ?>>
                    Contacted <span class="count">(<?php echo $status_counts['contacted']; ?>)</span>
                </a> |
            </li>
            <li>
                <a href="<?php echo admin_url('admin.php?page=nem-calculator-leads&status=qualified'); ?>" <?php echo $status_filter === 'qualified' ? 'class="current"' : ''; ?>>
                    Qualified <span class="count">(<?php echo $status_counts['qualified']; ?>)</span>
                </a> |
            </li>
            <li>
                <a href="<?php echo admin_url('admin.php?page=nem-calculator-leads&status=converted'); ?>" <?php echo $status_filter === 'converted' ? 'class="current"' : ''; ?>>
                    Converted <span class="count">(<?php echo $status_counts['converted']; ?>)</span>
                </a> |
            </li>
            <li>
                <a href="<?php echo admin_url('admin.php?page=nem-calculator-leads&status=lost'); ?>" <?php echo $status_filter === 'lost' ? 'class="current"' : ''; ?>>
                    Lost <span class="count">(<?php echo $status_counts['lost']; ?>)</span>
                </a>
            </li>
        </ul>
        
        <!-- Search and Filters -->
        <div class="nem-filters">
            <form method="get" action="">
                <input type="hidden" name="page" value="nem-calculator-leads">
                <?php if ($status_filter): ?>
                <input type="hidden" name="status" value="<?php echo esc_attr($status_filter); ?>">
                <?php endif; ?>
                
                <input type="search" name="s" value="<?php echo esc_attr($search); ?>" placeholder="Search by name, email, or phone...">
                
                <input type="date" name="date_from" value="<?php echo esc_attr($date_from); ?>" placeholder="From Date">
                <input type="date" name="date_to" value="<?php echo esc_attr($date_to); ?>" placeholder="To Date">
                
                <button type="submit" class="button">Filter</button>
                
                <?php if ($search || $date_from || $date_to): ?>
                <a href="<?php echo admin_url('admin.php?page=nem-calculator-leads' . ($status_filter ? '&status=' . $status_filter : '')); ?>" class="button">Clear Filters</a>
                <?php endif; ?>
            </form>
        </div>
        
        <!-- Leads Table -->
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th style="width: 40px;">
                        <input type="checkbox" id="select-all-leads">
                    </th>
                    <th>Date</th>
                    <th>Contact Info</th>
                    <th>Tariff</th>
                    <th>Location</th>
                    <th>System Details</th>
                    <th>Savings</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($leads)): ?>
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px;">
                        <div style="color: #666;">
                            <span class="dashicons dashicons-clipboard" style="font-size: 48px; opacity: 0.3;"></span>
                            <p style="font-size: 16px; margin: 10px 0;">No leads found</p>
                            <p>Start collecting leads by sharing your calculator!</p>
                        </div>
                    </td>
                </tr>
                <?php else: ?>
                    <?php foreach ($leads as $lead): ?>
                    <tr>
                        <td>
                            <input type="checkbox" class="lead-checkbox" value="<?php echo $lead->id; ?>">
                        </td>
                        <td>
                            <strong><?php echo date('M d, Y', strtotime($lead->created_at)); ?></strong><br>
                            <small><?php echo date('H:i', strtotime($lead->created_at)); ?></small>
                        </td>
                        <td>
                            <?php if ($lead->user_email): ?>
                                <strong><?php echo esc_html($lead->user_name ?: 'N/A'); ?></strong><br>
                                <a href="mailto:<?php echo esc_attr($lead->user_email); ?>">
                                    <?php echo esc_html($lead->user_email); ?>
                                </a><br>
                                <?php if ($lead->user_phone): ?>
                                <a href="tel:<?php echo esc_attr($lead->user_phone); ?>">
                                    <?php echo esc_html($lead->user_phone); ?>
                                </a>
                                <?php endif; ?>
                            <?php else: ?>
                                <em style="color: #999;">Anonymous</em>
                            <?php endif; ?>
                        </td>
                        <td>
                            <span class="nem-tariff-badge">
                                <?php echo esc_html($lead->tariff_group === 'tariff_a' ? 'Domestic Tariff A' : strtoupper($lead->tariff_group)); ?>
                            </span>
                        </td>
                        <td><?php echo esc_html(ucwords(str_replace('_', ' ', $lead->location))); ?></td>
                        <td>
                            <strong><?php echo number_format($lead->system_capacity, 1); ?> kWac</strong><br>
                            <small>
                                <?php echo esc_html(ucfirst($lead->mode_of_purchase)); ?><br>
                                Bill: RM <?php echo number_format($lead->monthly_bill, 2); ?>
                            </small>
                        </td>
                        <td>
                            <strong style="color: #10B981;">RM <?php echo number_format($lead->monthly_savings, 2); ?>/mo</strong><br>
                            <small>
                                RM <?php echo number_format($lead->annual_savings, 2); ?>/yr<br>
                                ROI: <?php echo number_format($lead->payback_period, 1); ?> years
                            </small>
                        </td>
                        <td>
                            <span class="nem-status-badge nem-status-<?php echo esc_attr($lead->lead_status); ?>">
                                <?php echo esc_html(ucfirst($lead->lead_status)); ?>
                            </span>
                        </td>
                        <td>
                            <a href="<?php echo admin_url('admin.php?page=nem-calculator-leads&action=view&id=' . $lead->id); ?>" class="button button-small">View</a>
                            <a href="<?php echo wp_nonce_url(admin_url('admin.php?page=nem-calculator-leads&action=delete&id=' . $lead->id), 'nem_delete_lead_' . $lead->id); ?>" class="button button-small" onclick="return confirm('Are you sure you want to delete this lead?');">Delete</a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
        
        <!-- Pagination -->
        <?php if ($total_pages > 1): ?>
        <div class="tablenav bottom">
            <div class="tablenav-pages">
                <span class="displaying-num"><?php echo number_format($total_leads); ?> items</span>
                <?php
                $page_links = paginate_links(array(
                    'base' => add_query_arg('paged', '%#%'),
                    'format' => '',
                    'prev_text' => '&laquo;',
                    'next_text' => '&raquo;',
                    'total' => $total_pages,
                    'current' => $current_page
                ));
                echo $page_links;
                ?>
            </div>
        </div>
        <?php endif; ?>
    </div>
    
    <style>
    .nem-leads-page {
        margin: 20px 20px 20px 0;
    }
    
    .nem-filters {
        margin: 20px 0;
        padding: 15px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
    }
    
    .nem-filters form {
        display: flex;
        gap: 10px;
        align-items: center;
    }
    
    .nem-filters input[type="search"],
    .nem-filters input[type="date"] {
        padding: 6px 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
    }
    
    .nem-filters input[type="search"] {
        min-width: 300px;
    }
    
    .nem-tariff-badge {
        display: inline-block;
        padding: 4px 8px;
        background: #EFF6FF;
        color: #1E40AF;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
    }
    </style>
    <?php
}

// View single lead
function nem_calculator_view_lead($lead_id) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'nem_calculations';
    
    $lead = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $lead_id));
    
    if (!$lead) {
        echo '<div class="wrap"><h1>Lead not found</h1></div>';
        return;
    }
    
    ?>
    <div class="wrap nem-lead-detail">
        <h1>
            <a href="<?php echo admin_url('admin.php?page=nem-calculator-leads'); ?>">← Back to Leads</a>
        </h1>
        
        <div class="nem-lead-content">
            <div class="nem-lead-main">
                <!-- Contact Information -->
                <div class="nem-detail-box">
                    <h2>Contact Information</h2>
                    <table class="form-table">
                        <tr>
                            <th>Name:</th>
                            <td><strong><?php echo esc_html($lead->user_name ?: 'N/A'); ?></strong></td>
                        </tr>
                        <tr>
                            <th>Email:</th>
                            <td>
                                <?php if ($lead->user_email): ?>
                                <a href="mailto:<?php echo esc_attr($lead->user_email); ?>"><?php echo esc_html($lead->user_email); ?></a>
                                <?php else: ?>
                                <em>Not provided</em>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <th>Phone:</th>
                            <td>
                                <?php if ($lead->user_phone): ?>
                                <a href="tel:<?php echo esc_attr($lead->user_phone); ?>"><?php echo esc_html($lead->user_phone); ?></a>
                                <?php else: ?>
                                <em>Not provided</em>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <th>Date:</th>
                            <td><?php echo date('F j, Y \a\t g:i A', strtotime($lead->created_at)); ?></td>
                        </tr>
                        <tr>
                            <th>IP Address:</th>
                            <td><?php echo esc_html($lead->user_ip); ?></td>
                        </tr>
                    </table>
                </div>
                
                <!-- Calculation Details -->
                <div class="nem-detail-box">
                    <h2>Calculation Details</h2>
                    <div class="nem-calc-grid">
                        <div class="nem-calc-item">
                            <label>Tariff</label>
                            <strong><?php echo esc_html($lead->tariff_group === 'tariff_a' ? 'Domestic Tariff A' : strtoupper($lead->tariff_group)); ?></strong>
                        </div>
                        <div class="nem-calc-item">
                            <label>Location</label>
                            <strong><?php echo esc_html(ucwords(str_replace('_', ' ', $lead->location))); ?></strong>
                        </div>
                        <div class="nem-calc-item">
                            <label>Voltage Level</label>
                            <strong><?php echo esc_html($lead->voltage_level ?: 'N/A'); ?></strong>
                        </div>
                        <div class="nem-calc-item">
                            <label>Building Type</label>
                            <strong><?php echo esc_html($lead->building_type ?: 'N/A'); ?></strong>
                        </div>
                        <div class="nem-calc-item">
                            <label>Max Demand</label>
                            <strong><?php echo $lead->max_demand ? number_format($lead->max_demand, 2) . ' kWac' : 'N/A'; ?></strong>
                        </div>
                        <div class="nem-calc-item">
                            <label>Monthly Bill</label>
                            <strong>RM <?php echo number_format($lead->monthly_bill, 2); ?></strong>
                        </div>
                        <div class="nem-calc-item">
                            <label>Mode of Purchase</label>
                            <strong><?php echo esc_html(ucfirst($lead->mode_of_purchase)); ?></strong>
                        </div>
                        <div class="nem-calc-item">
                            <label>Solar Rate</label>
                            <strong>RM <?php echo number_format($lead->solar_rate, 4); ?>/kWh</strong>
                        </div>
                    </div>
                </div>
                
                <!-- Results Summary -->
                <div class="nem-detail-box">
                    <h2>Results Summary</h2>
                    <div class="nem-results-cards">
                        <div class="nem-result-card">
                            <span class="dashicons dashicons-admin-settings"></span>
                            <h3>System Capacity</h3>
                            <p><?php echo number_format($lead->system_capacity, 1); ?> kWac</p>
                        </div>
                        <div class="nem-result-card">
                            <span class="dashicons dashicons-lightbulb"></span>
                            <h3>Monthly Generation</h3>
                            <p><?php echo number_format($lead->monthly_generation, 0); ?> kWh</p>
                        </div>
                        <div class="nem-result-card">
                            <span class="dashicons dashicons-money-alt"></span>
                            <h3>Monthly Savings</h3>
                            <p>RM <?php echo number_format($lead->monthly_savings, 2); ?></p>
                        </div>
                        <div class="nem-result-card">
                            <span class="dashicons dashicons-calendar-alt"></span>
                            <h3>Annual Savings</h3>
                            <p>RM <?php echo number_format($lead->annual_savings, 2); ?></p>
                        </div>
                        <div class="nem-result-card">
                            <span class="dashicons dashicons-chart-line"></span>
                            <h3>Payback Period</h3>
                            <p><?php echo number_format($lead->payback_period, 1); ?> years</p>
                        </div>
                        <div class="nem-result-card">
                            <span class="dashicons dashicons-star-filled"></span>
                            <h3>Lifetime Savings (25yr)</h3>
                            <p>RM <?php echo number_format($lead->lifetime_savings, 2); ?></p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="nem-lead-sidebar">
                <!-- Lead Status Update -->
                <div class="nem-detail-box">
                    <h2>Lead Management</h2>
                    <form method="post" action="">
                        <?php wp_nonce_field('nem_update_lead'); ?>
                        <input type="hidden" name="lead_id" value="<?php echo $lead->id; ?>">
                        <input type="hidden" name="nem_update_lead" value="1">
                        
                        <p>
                            <label><strong>Lead Status</strong></label>
                            <select name="lead_status" class="widefat">
                                <option value="new" <?php selected($lead->lead_status, 'new'); ?>>New</option>
                                <option value="contacted" <?php selected($lead->lead_status, 'contacted'); ?>>Contacted</option>
                                <option value="qualified" <?php selected($lead->lead_status, 'qualified'); ?>>Qualified</option>
                                <option value="proposal_sent" <?php selected($lead->lead_status, 'proposal_sent'); ?>>Proposal Sent</option>
                                <option value="converted" <?php selected($lead->lead_status, 'converted'); ?>>Converted</option>
                                <option value="lost" <?php selected($lead->lead_status, 'lost'); ?>>Lost</option>
                            </select>
                        </p>
                        
                        <p>
                            <label><strong>Admin Notes</strong></label>
                            <textarea name="admin_notes" rows="6" class="widefat"><?php echo esc_textarea($lead->admin_notes); ?></textarea>
                        </p>
                        
                        <p>
                            <button type="submit" class="button button-primary button-large" style="width: 100%;">
                                Update Lead
                            </button>
                        </p>
                    </form>
                </div>
                
                <!-- Quick Actions -->
                <div class="nem-detail-box">
                    <h2>Quick Actions</h2>
                    <p>
                        <?php if ($lead->user_email): ?>
                        <a href="mailto:<?php echo esc_attr($lead->user_email); ?>" class="button button-large" style="width: 100%; margin-bottom: 10px;">
                            <span class="dashicons dashicons-email-alt"></span> Send Email
                        </a>
                        <?php endif; ?>
                        
                        <?php if ($lead->user_phone): ?>
                        <a href="https://wa.me/<?php echo preg_replace('/[^0-9]/', '', $lead->user_phone); ?>" target="_blank" class="button button-large" style="width: 100%; margin-bottom: 10px;">
                            <span class="dashicons dashicons-whatsapp"></span> WhatsApp
                        </a>
                        <?php endif; ?>
                        
                        <a href="<?php echo wp_nonce_url(admin_url('admin.php?page=nem-calculator-leads&action=delete&id=' . $lead->id), 'nem_delete_lead_' . $lead->id); ?>" class="button button-large" style="width: 100%;" onclick="return confirm('Are you sure?');">
                            <span class="dashicons dashicons-trash"></span> Delete Lead
                        </a>
                    </p>
                </div>
            </div>
        </div>
    </div>
    
    <style>
    .nem-lead-content {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 20px;
        margin-top: 20px;
    }
    
    .nem-detail-box {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 20px;
    }
    
    .nem-detail-box h2 {
        margin: 0 0 15px 0;
        font-size: 16px;
        font-weight: 600;
        padding-bottom: 10px;
        border-bottom: 2px solid #f1f5f9;
    }
    
    .nem-calc-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
    }
    
    .nem-calc-item label {
        display: block;
        font-size: 12px;
        color: #64748b;
        margin-bottom: 5px;
    }
    
    .nem-calc-item strong {
        font-size: 14px;
        color: #1e293b;
    }
    
    .nem-results-cards {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
    }
    
    .nem-result-card {
        text-align: center;
        padding: 15px;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    }
    
    .nem-result-card .dashicons {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: #00D4FF;
        margin-bottom: 5px;
    }
    
    .nem-result-card h3 {
        font-size: 12px;
        color: #64748b;
        margin: 5px 0;
        font-weight: 600;
    }
    
    .nem-result-card p {
        font-size: 18px;
        font-weight: 700;
        color: #1e293b;
        margin: 5px 0 0 0;
    }
    </style>
    <?php
}

// Export leads to CSV
function nem_calculator_export_leads() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'nem_calculations';
    
    $leads = $wpdb->get_results("SELECT * FROM $table_name ORDER BY created_at DESC", ARRAY_A);
    
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="nem-calculator-leads-' . date('Y-m-d') . '.csv"');
    
    $output = fopen('php://output', 'w');
    
    // Headers
    fputcsv($output, array(
        'ID', 'Date', 'Name', 'Email', 'Phone', 'Tariff', 'Location', 'Voltage', 'Building Type',
        'Max Demand', 'Monthly Bill', 'Mode', 'Solar Rate', 'System Capacity', 'Monthly Generation',
        'Monthly Savings', 'Annual Savings', 'Payback Period', 'Lifetime Savings', 'Lead Status', 'Notes'
    ));
    
    // Data
    foreach ($leads as $lead) {
        fputcsv($output, array(
            $lead['id'],
            $lead['created_at'],
            $lead['user_name'],
            $lead['user_email'],
            $lead['user_phone'],
            $lead['tariff_group'],
            $lead['location'],
            $lead['voltage_level'],
            $lead['building_type'],
            $lead['max_demand'],
            $lead['monthly_bill'],
            $lead['mode_of_purchase'],
            $lead['solar_rate'],
            $lead['system_capacity'],
            $lead['monthly_generation'],
            $lead['monthly_savings'],
            $lead['annual_savings'],
            $lead['payback_period'],
            $lead['lifetime_savings'],
            $lead['lead_status'],
            $lead['admin_notes']
        ));
    }
    
    fclose($output);
}
