<?php
/**
 * Admin Settings Page
 */

// Add admin menu
add_action('admin_menu', 'nem_calculator_add_admin_menu');
function nem_calculator_add_admin_menu() {
    // Main menu
    add_menu_page(
        'Solana Tec Calculator',
        'Solana Tec',
        'manage_options',
        'nem-calculator',
        'nem_calculator_dashboard_page',
        'dashicons-calculator',
        30
    );
    
    // Dashboard submenu
    add_submenu_page(
        'nem-calculator',
        'Dashboard',
        'Dashboard',
        'manage_options',
        'nem-calculator',
        'nem_calculator_dashboard_page'
    );
    
    // Leads submenu
    add_submenu_page(
        'nem-calculator',
        'Lead Management',
        'Leads',
        'manage_options',
        'nem-calculator-leads',
        'nem_calculator_leads_page'
    );
    
    // Settings submenu
    add_submenu_page(
        'nem-calculator',
        'Settings',
        'Settings',
        'manage_options',
        'nem-calculator-settings',
        'nem_calculator_settings_page'
    );
}

// Register settings
add_action('admin_init', 'nem_calculator_register_settings');
function nem_calculator_register_settings() {
    register_setting('nem_calculator_settings_group', 'nem_calculator_settings', 'nem_calculator_sanitize_settings');
}

function nem_calculator_sanitize_settings($input) {
    $sanitized = array();

    $sanitized['primary_color'] = !empty($input['primary_color']) ? sanitize_hex_color($input['primary_color']) : '#00D4FF';
    $sanitized['secondary_color'] = !empty($input['secondary_color']) ? sanitize_hex_color($input['secondary_color']) : '#8B5CF6';
    $sanitized['accent_color'] = !empty($input['accent_color']) ? sanitize_hex_color($input['accent_color']) : '#EC4899';
    $sanitized['button_text_color'] = !empty($input['button_text_color']) ? sanitize_hex_color($input['button_text_color']) : '#FFFFFF';
    $sanitized['enable_lead_capture'] = !empty($input['enable_lead_capture']) ? 1 : 0;
    $sanitized['lead_capture_heading'] = isset($input['lead_capture_heading']) ? sanitize_text_field($input['lead_capture_heading']) : 'Want us to walk you through it?';
    $sanitized['lead_capture_description'] = isset($input['lead_capture_description']) ? sanitize_textarea_field($input['lead_capture_description']) : 'Leave your name and contact number so the Solana Tec team can follow up with a more personalised recommendation.';
    $sanitized['enable_cta_button'] = !empty($input['enable_cta_button']) ? 1 : 0;
    $sanitized['cta_button_text'] = isset($input['cta_button_text']) ? sanitize_text_field($input['cta_button_text']) : 'Contact Us for Free Quote';
    $sanitized['cta_button_url'] = isset($input['cta_button_url']) ? esc_url_raw($input['cta_button_url']) : '';
    $sanitized['cta_heading'] = isset($input['cta_heading']) ? sanitize_text_field($input['cta_heading']) : 'Ready to Start Saving?';
    $sanitized['cta_description'] = isset($input['cta_description']) ? sanitize_textarea_field($input['cta_description']) : 'Get in touch with our solar experts for a personalized quote and site assessment.';
    $sanitized['cta_button_style'] = (isset($input['cta_button_style']) && 'custom' === $input['cta_button_style']) ? 'custom' : 'whatsapp';
    $sanitized['report_email_subject'] = isset($input['report_email_subject']) ? sanitize_text_field($input['report_email_subject']) : 'Your Solar Assessment report is here';
    $sanitized['admin_notification_subject'] = isset($input['admin_notification_subject']) ? sanitize_text_field($input['admin_notification_subject']) : 'New Solana Tec calculator lead';

    $admin_notification_email = isset($input['admin_notification_email']) ? sanitize_email($input['admin_notification_email']) : '';
    $sanitized['admin_notification_email'] = is_email($admin_notification_email) ? $admin_notification_email : '';

    return $sanitized;
}

// Settings page HTML
function nem_calculator_settings_page() {
    $settings = get_option('nem_calculator_settings', array());
    ?>
    <div class="wrap">
        <h1>NEM Calculator Settings</h1>
        <p>This version is set up for Domestic Tariff A estimates only.</p>
        
        <form method="post" action="options.php">
            <?php settings_fields('nem_calculator_settings_group'); ?>
            
            <table class="form-table">
                <tr>
                    <th colspan="2">
                        <h2>Color Customization</h2>
                    </th>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="primary_color">Primary Color (Cyan/Blue)</label>
                    </th>
                    <td>
                        <input type="color" 
                               name="nem_calculator_settings[primary_color]" 
                               id="primary_color" 
                               value="<?php echo isset($settings['primary_color']) ? esc_attr($settings['primary_color']) : '#00D4FF'; ?>">
                        <p class="description">Used for primary UI elements and accents</p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="secondary_color">Secondary Color (Purple)</label>
                    </th>
                    <td>
                        <input type="color" 
                               name="nem_calculator_settings[secondary_color]" 
                               id="secondary_color" 
                               value="<?php echo isset($settings['secondary_color']) ? esc_attr($settings['secondary_color']) : '#8B5CF6'; ?>">
                        <p class="description">Used for secondary UI elements</p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="accent_color">Accent Color (Pink)</label>
                    </th>
                    <td>
                        <input type="color" 
                               name="nem_calculator_settings[accent_color]" 
                               id="accent_color" 
                               value="<?php echo isset($settings['accent_color']) ? esc_attr($settings['accent_color']) : '#EC4899'; ?>">
                        <p class="description">Used for button gradient accent</p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="button_text_color">Button Text Color</label>
                    </th>
                    <td>
                        <input type="color" 
                               name="nem_calculator_settings[button_text_color]" 
                               id="button_text_color" 
                               value="<?php echo isset($settings['button_text_color']) ? esc_attr($settings['button_text_color']) : '#FFFFFF'; ?>">
                        <p class="description">Text color for buttons</p>
                    </td>
                </tr>
                
                <tr>
                    <th colspan="2">
                        <h2>Calculator Scope</h2>
                    </th>
                </tr>
                
                <tr>
                    <th scope="row">Included Inputs</th>
                    <td>
                        <p class="description" style="margin: 0;">
                            This production release always shows monthly bill, location, payment method, and voltage level for Domestic Tariff A calculations.
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th colspan="2">
                        <h2>Email Delivery</h2>
                    </th>
                </tr>

                <tr>
                    <th scope="row">
                        <label for="report_email_subject">Visitor Report Email Subject</label>
                    </th>
                    <td>
                        <input type="text"
                               name="nem_calculator_settings[report_email_subject]"
                               id="report_email_subject"
                               value="<?php echo isset($settings['report_email_subject']) ? esc_attr($settings['report_email_subject']) : 'Your Solar Assessment report is here'; ?>"
                               class="regular-text">
                        <p class="description">Subject line used when the calculator emails the estimate to the visitor.</p>
                    </td>
                </tr>

                <tr>
                    <th scope="row">
                        <label for="admin_notification_subject">Admin Notification Subject</label>
                    </th>
                    <td>
                        <input type="text"
                               name="nem_calculator_settings[admin_notification_subject]"
                               id="admin_notification_subject"
                               value="<?php echo isset($settings['admin_notification_subject']) ? esc_attr($settings['admin_notification_subject']) : 'New Solana Tec calculator lead'; ?>"
                               class="regular-text">
                        <p class="description">Subject line used for the lead notification email sent to your team.</p>
                    </td>
                </tr>

                <tr>
                    <th scope="row">
                        <label for="admin_notification_email">Notification Recipient</label>
                    </th>
                    <td>
                        <input type="email"
                               name="nem_calculator_settings[admin_notification_email]"
                               id="admin_notification_email"
                               value="<?php echo isset($settings['admin_notification_email']) ? esc_attr($settings['admin_notification_email']) : ''; ?>"
                               class="regular-text"
                               placeholder="<?php echo esc_attr(get_option('admin_email')); ?>">
                        <p class="description">Optional. Leave blank to use the WordPress admin email: <code><?php echo esc_html(get_option('admin_email')); ?></code></p>
                    </td>
                </tr>

                <tr>
                    <th colspan="2">
                        <h2>Lead Capture (After Results)</h2>
                    </th>
                </tr>
                
                <tr>
                    <th scope="row">Enable Lead Capture</th>
                    <td>
                        <input type="checkbox" 
                               name="nem_calculator_settings[enable_lead_capture]" 
                               value="1" 
                               id="enable-lead-capture"
                               <?php checked(isset($settings['enable_lead_capture']) ? $settings['enable_lead_capture'] : 0, 1); ?>>
                        <label>Show contact fields after the calculation results are displayed</label>
                        <p class="description">The calculator now collects email before the estimate runs. This follow-up form is for name and contact number after the results are shown.</p>
                    </td>
                </tr>
                
                <tr class="lead-capture-option">
                    <th scope="row">
                        <label for="lead_capture_heading">Section Heading</label>
                    </th>
                    <td>
                        <input type="text" 
                               name="nem_calculator_settings[lead_capture_heading]" 
                               id="lead_capture_heading" 
                               value="<?php echo isset($settings['lead_capture_heading']) ? esc_attr($settings['lead_capture_heading']) : 'Want us to walk you through it?'; ?>"
                               class="regular-text">
                    </td>
                </tr>
                
                <tr class="lead-capture-option">
                    <th scope="row">
                        <label for="lead_capture_description">Section Description</label>
                    </th>
                    <td>
                        <textarea name="nem_calculator_settings[lead_capture_description]" 
                                  id="lead_capture_description" 
                                  rows="2" 
                                  class="large-text"><?php echo isset($settings['lead_capture_description']) ? esc_textarea($settings['lead_capture_description']) : 'Leave your name and contact number so the Solana Tec team can follow up with a more personalised recommendation.'; ?></textarea>
                    </td>
                </tr>
                
                <tr>
                    <th colspan="2">
                        <h2>Call-to-Action Button (After Results)</h2>
                    </th>
                </tr>
                
                <tr>
                    <th scope="row">Enable CTA Button</th>
                    <td>
                        <input type="checkbox" 
                               name="nem_calculator_settings[enable_cta_button]" 
                               value="1" 
                               id="enable-cta-button"
                               <?php checked(isset($settings['enable_cta_button']) ? $settings['enable_cta_button'] : 0, 1); ?>>
                        <label>Show call-to-action button after calculation results</label>
                    </td>
                </tr>
                
                <tr class="cta-option">
                    <th scope="row">
                        <label for="cta_button_text">Button Text</label>
                    </th>
                    <td>
                        <input type="text" 
                               name="nem_calculator_settings[cta_button_text]" 
                               id="cta_button_text" 
                               value="<?php echo isset($settings['cta_button_text']) ? esc_attr($settings['cta_button_text']) : 'Contact Us for Free Quote'; ?>"
                               class="regular-text">
                        <p class="description">Text displayed on the button (e.g., "WhatsApp Us", "Get Free Quote")</p>
                    </td>
                </tr>
                
                <tr class="cta-option">
                    <th scope="row">
                        <label for="cta_button_url">Button URL/Link</label>
                    </th>
                    <td>
                        <input type="url" 
                               name="nem_calculator_settings[cta_button_url]" 
                               id="cta_button_url" 
                               value="<?php echo isset($settings['cta_button_url']) ? esc_url($settings['cta_button_url']) : ''; ?>"
                               class="regular-text"
                               placeholder="https://wa.me/60123456789">
                        <p class="description">
                            Full URL including https://<br>
                            <strong>WhatsApp:</strong> https://wa.me/60123456789<br>
                            <strong>Contact Page:</strong> https://yoursite.com/contact<br>
                            <strong>Email:</strong> mailto:info@yoursite.com
                        </p>
                    </td>
                </tr>
                
                <tr class="cta-option">
                    <th scope="row">
                        <label for="cta_heading">CTA Heading (Optional)</label>
                    </th>
                    <td>
                        <input type="text" 
                               name="nem_calculator_settings[cta_heading]" 
                               id="cta_heading" 
                               value="<?php echo isset($settings['cta_heading']) ? esc_attr($settings['cta_heading']) : 'Ready to Start Saving?'; ?>"
                               class="regular-text">
                        <p class="description">Heading text above the button</p>
                    </td>
                </tr>
                
                <tr class="cta-option">
                    <th scope="row">
                        <label for="cta_description">CTA Description (Optional)</label>
                    </th>
                    <td>
                        <textarea name="nem_calculator_settings[cta_description]" 
                                  id="cta_description" 
                                  rows="3" 
                                  class="large-text"><?php echo isset($settings['cta_description']) ? esc_textarea($settings['cta_description']) : 'Get in touch with our solar experts for a personalized quote and site assessment.'; ?></textarea>
                        <p class="description">Optional description text</p>
                    </td>
                </tr>
                
                <tr class="cta-option">
                    <th scope="row">
                        <label for="cta_button_style">Button Style</label>
                    </th>
                    <td>
                        <select name="nem_calculator_settings[cta_button_style]" id="cta_button_style">
                            <option value="whatsapp" <?php selected(isset($settings['cta_button_style']) ? $settings['cta_button_style'] : 'whatsapp', 'whatsapp'); ?>>WhatsApp Green</option>
                            <option value="custom" <?php selected(isset($settings['cta_button_style']) ? $settings['cta_button_style'] : '', 'custom'); ?>>Custom (Uses Your Colors)</option>
                        </select>
                        <p class="description">Choose button color style</p>
                    </td>
                </tr>
            </table>
            
            <script>
            jQuery(document).ready(function($) {
                function toggleCTAOptions() {
                    if ($('#enable-cta-button').is(':checked')) {
                        $('.cta-option').show();
                    } else {
                        $('.cta-option').hide();
                    }
                }
                
                function toggleLeadCaptureOptions() {
                    if ($('#enable-lead-capture').is(':checked')) {
                        $('.lead-capture-option').show();
                    } else {
                        $('.lead-capture-option').hide();
                    }
                }
                
                toggleCTAOptions();
                toggleLeadCaptureOptions();
                
                $('#enable-cta-button').on('change', toggleCTAOptions);
                $('#enable-lead-capture').on('change', toggleLeadCaptureOptions);
            });
            </script>
            
            <h2>Shortcode Usage</h2>
            <p>Use the following shortcode to display the domestic calculator on any page or post:</p>
            <code>[nem_calculator]</code>
            
            <?php submit_button(); ?>
        </form>
        
        <div class="nem-calc-preview" style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
            <h2>Color Preview</h2>
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div style="text-align: center;">
                    <div style="width: 100px; height: 100px; background: <?php echo esc_attr($settings['primary_color'] ?? '#00D4FF'); ?>; border-radius: 8px;"></div>
                    <p><strong>Primary</strong></p>
                </div>
                <div style="text-align: center;">
                    <div style="width: 100px; height: 100px; background: <?php echo esc_attr($settings['secondary_color'] ?? '#8B5CF6'); ?>; border-radius: 8px;"></div>
                    <p><strong>Secondary</strong></p>
                </div>
                <div style="text-align: center;">
                    <div style="width: 100px; height: 100px; background: <?php echo esc_attr($settings['accent_color'] ?? '#EC4899'); ?>; border-radius: 8px;"></div>
                    <p><strong>Accent</strong></p>
                </div>
                <div style="text-align: center;">
                    <div style="width: 100px; height: 100px; background: linear-gradient(135deg, <?php echo esc_attr($settings['primary_color'] ?? '#00D4FF'); ?> 0%, <?php echo esc_attr($settings['secondary_color'] ?? '#8B5CF6'); ?> 50%, <?php echo esc_attr($settings['accent_color'] ?? '#EC4899'); ?> 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: <?php echo esc_attr($settings['button_text_color'] ?? '#FFFFFF'); ?>; font-weight: bold;">Button</div>
                    <p><strong>Gradient</strong></p>
                </div>
            </div>
        </div>
    </div>
    
    <style>
        .nem-calc-preview {
            animation: fadeIn 0.5s;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
    <?php
}

// Enqueue admin styles
add_action('admin_enqueue_scripts', 'nem_calculator_admin_scripts');
function nem_calculator_admin_scripts($hook) {
    // Only load on our plugin pages
    if (strpos($hook, 'nem-calculator') === false) {
        return;
    }
    
    wp_enqueue_style('wp-color-picker');
    wp_enqueue_script('wp-color-picker');
    
    // Enqueue Chart.js for dashboard
    if ($hook === 'toplevel_page_nem-calculator' || $hook === 'nem-calculator_page_nem-calculator-leads') {
        wp_enqueue_script('chartjs', 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js', array(), '4.4.1', true);
    }
}
