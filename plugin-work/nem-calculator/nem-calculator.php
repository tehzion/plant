<?php
/**
 * Plugin Name: Solana Tec Smart Solar Calculator
 * Plugin URI: https://mojodigital.com
 * Description: A domestic Tariff A smart solar calculator with February 2026 NEM/ATAP rates, import/export differential, and battery-storage guidance.
 * Version: 2.0.6
 * Author: Mojo Digital
 * Author URI: https://mojodigital.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: solana-tec-calculator
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('NEM_CALC_VERSION', '2.0.6');
define('NEM_CALC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('NEM_CALC_PLUGIN_URL', plugin_dir_url(__FILE__));

// Include required files
require_once NEM_CALC_PLUGIN_DIR . 'includes/class-nem-calculator.php';
require_once NEM_CALC_PLUGIN_DIR . 'includes/admin-settings.php';
require_once NEM_CALC_PLUGIN_DIR . 'includes/dashboard.php';
require_once NEM_CALC_PLUGIN_DIR . 'includes/leads.php';
require_once NEM_CALC_PLUGIN_DIR . 'includes/shortcode.php';

// Initialize the plugin
function nem_calculator_init() {
    $nem_calculator = new NEM_Calculator();
}
add_action('plugins_loaded', 'nem_calculator_init');

// Activation hook
register_activation_hook(__FILE__, 'nem_calculator_activate');
function nem_calculator_activate() {
    global $wpdb;
    
    // Set default options
    $default_options = array(
        'primary_color' => '#00D4FF',
        'secondary_color' => '#8B5CF6',
        'accent_color' => '#EC4899',
        'button_text_color' => '#FFFFFF',
        'report_email_subject' => 'Your Solar Assessment report is here',
        'admin_notification_subject' => 'New Solana Tec calculator lead',
        'admin_notification_email' => '',
    );
    
    add_option('nem_calculator_settings', $default_options);
    
    // Create calculations table
    $table_name = $wpdb->prefix . 'nem_calculations';
    $charset_collate = $wpdb->get_charset_collate();
    
    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        user_email varchar(255) DEFAULT NULL,
        user_name varchar(255) DEFAULT NULL,
        user_phone varchar(50) DEFAULT NULL,
        tariff_group varchar(50) NOT NULL,
        location varchar(100) NOT NULL,
        voltage_level varchar(50) DEFAULT NULL,
        building_type varchar(100) DEFAULT NULL,
        max_demand decimal(10,2) DEFAULT NULL,
        monthly_bill decimal(10,2) NOT NULL,
        mode_of_purchase varchar(50) NOT NULL,
        solar_rate decimal(10,4) NOT NULL,
        peak_percentage int(3) DEFAULT NULL,
        system_capacity decimal(10,2) NOT NULL,
        monthly_generation decimal(10,2) NOT NULL,
        monthly_savings decimal(10,2) NOT NULL,
        annual_savings decimal(10,2) NOT NULL,
        payback_period decimal(10,2) NOT NULL,
        lifetime_savings decimal(10,2) NOT NULL,
        user_ip varchar(100) DEFAULT NULL,
        user_agent text DEFAULT NULL,
        lead_status varchar(50) DEFAULT 'new',
        admin_notes text DEFAULT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY tariff_group (tariff_group),
        KEY location (location),
        KEY lead_status (lead_status),
        KEY created_at (created_at)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
    
    // Add version option
    add_option('nem_calculator_version', NEM_CALC_VERSION);
}

// Deactivation hook
register_deactivation_hook(__FILE__, 'nem_calculator_deactivate');
function nem_calculator_deactivate() {
    // Cleanup if needed
}

// Enqueue styles and scripts
function nem_calculator_enqueue_assets() {
    wp_enqueue_style('nem-calculator-styles', NEM_CALC_PLUGIN_URL . 'assets/css/nem-calculator.css', array(), NEM_CALC_VERSION);
    
    // Enqueue Chart.js from CDN
    wp_enqueue_script('chartjs', 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js', array(), '4.4.1', true);
    
    // Enqueue main script
    wp_enqueue_script('nem-calculator-script', NEM_CALC_PLUGIN_URL . 'assets/js/nem-calculator.js', array('jquery', 'chartjs'), NEM_CALC_VERSION, true);
    
    // Pass settings to JavaScript
    $settings = get_option('nem_calculator_settings', array());
    wp_localize_script('nem-calculator-script', 'nemCalcSettings', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('nem_calculator_nonce'),
        'colors' => array(
            'primary' => isset($settings['primary_color']) ? $settings['primary_color'] : '#00D4FF',
            'secondary' => isset($settings['secondary_color']) ? $settings['secondary_color'] : '#8B5CF6',
            'accent' => isset($settings['accent_color']) ? $settings['accent_color'] : '#EC4899',
            'buttonText' => isset($settings['button_text_color']) ? $settings['button_text_color'] : '#FFFFFF',
        )
    ));
}
add_action('wp_enqueue_scripts', 'nem_calculator_enqueue_assets');

// Admin notice for configuration check
add_action('admin_notices', 'nem_calculator_admin_notices');
function nem_calculator_admin_notices() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'nem_calculations';
    
    // Check if table exists
    $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
    
    if (!$table_exists) {
        ?>
        <div class="notice notice-warning is-dismissible">
            <p><strong>NEM Calculator:</strong> We could not find the calculator data table yet. Please deactivate and reactivate the plugin once to finish the setup.</p>
        </div>
        <?php
    }
    
    // Check if WordPress is in debug mode
    if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
        $current_screen = get_current_screen();
        if ($current_screen && strpos($current_screen->id, 'nem-calculator') !== false) {
            ?>
            <div class="notice notice-info">
                <p><strong>NEM Calculator debug mode is on:</strong> If you need more detail, you can review <code>/wp-content/debug.log</code>.</p>
            </div>
            <?php
        }
    }
}
