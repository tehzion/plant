<?php
/**
 * Main NEM Calculator Class
 * Version 1.1 - Enhanced with real TNB rates, peak/off-peak, and solar irradiance data
 */

class NEM_Calculator {
    
    private $tariff_groups;
    private $tnb_rates;
    private $solar_irradiance;
    
    public function __construct() {
        $this->init_tariff_groups();
        $this->init_tnb_rates();
        $this->init_solar_irradiance();
        add_action('wp_ajax_nem_calculate', array($this, 'calculate_nem'));
        add_action('wp_ajax_nopriv_nem_calculate', array($this, 'calculate_nem'));
        add_action('wp_ajax_nem_capture_lead', array($this, 'capture_lead'));
        add_action('wp_ajax_nopriv_nem_capture_lead', array($this, 'capture_lead'));
    }
    
    private function init_solar_irradiance() {
        // Average daily solar irradiance (kWh/m²/day) by location in Malaysia
        // Based on Malaysian Meteorological Department data
        $this->solar_irradiance = array(
            'johor_bahru' => array(
                'name' => 'Johor Bahru',
                'irradiance' => 4.7,
                'peak_sun_hours' => 4.7,
                'efficiency_factor' => 0.83
            ),
            'batu_pahat' => array(
                'name' => 'Batu Pahat',
                'irradiance' => 4.7,
                'peak_sun_hours' => 4.7,
                'efficiency_factor' => 0.83
            ),
            'kluang' => array(
                'name' => 'Kluang',
                'irradiance' => 4.7,
                'peak_sun_hours' => 4.7,
                'efficiency_factor' => 0.83
            ),
            'muar' => array(
                'name' => 'Muar',
                'irradiance' => 4.7,
                'peak_sun_hours' => 4.7,
                'efficiency_factor' => 0.83
            ),
            'melaka' => array(
                'name' => 'Melaka',
                'irradiance' => 4.6,
                'peak_sun_hours' => 4.6,
                'efficiency_factor' => 0.81
            ),
            'johor' => array(
                'name' => 'Johor (Other Areas)',
                'irradiance' => 4.7,
                'peak_sun_hours' => 4.7,
                'efficiency_factor' => 0.83
            )
        );
    }
    
    private function init_tnb_rates() {
        // NEM/ATAP Solar Rates (February 2026)
        // When you import power at night, you pay for these components:
        $this->solar_rates = array(
            'import_rate' => array(
                'energy_charge' => 0.3703,      // RM/kWh - Energy component
                'capacity_charge' => 0.0455,    // RM/kWh - Capacity component
                'network_charge' => 0.1285,     // RM/kWh - Network component
                'forecast_afa' => -0.0499,      // RM/kWh - Rebate (February 2026)
                'total' => 0.4944               // RM/kWh - Total import rate
            ),
            'export_rate' => 0.3700,            // RM/kWh - Solar export offset rate (energy charge only)
            'price_gap' => 0.1244               // RM/kWh - Loss per kWh (RM 0.4944 - RM 0.3700 = RM 0.1244)
        );
        
        // Important: The "Price Gap"
        // - Export solar to grid: earn RM 0.37/kWh
        // - Import same energy back: pay RM 0.49/kWh  
        // - Net loss: RM 0.12/kWh by using grid as "battery"
        // - This is why physical batteries improve ROI significantly
        
        // TNB Electricity Tariff Rates (2025) - RM per kWh
        $this->tnb_rates = array(
            'tariff_a' => array(
                'name' => 'Domestic Tariff',
                'blocks' => array(
                    array('min' => 0, 'max' => 200, 'rate' => 0.218),
                    array('min' => 201, 'max' => 300, 'rate' => 0.334),
                    array('min' => 301, 'max' => 600, 'rate' => 0.516),
                    array('min' => 601, 'max' => 900, 'rate' => 0.546),
                    array('min' => 901, 'max' => PHP_INT_MAX, 'rate' => 0.571)
                ),
                'minimum_charge' => 3.00
            ),
            'tariff_b' => array(
                'name' => 'Low Voltage Commercial',
                'rate' => 0.365,
                'minimum_charge' => 7.20
            ),
            'tariff_c1' => array(
                'name' => 'Medium Voltage General Commercial',
                'rate' => 0.337,
                'demand_charge' => 30.30, // RM per kW
                'minimum_charge' => 600.00
            ),
            'tariff_c2' => array(
                'name' => 'Medium Voltage Peak/Off-Peak Commercial',
                'peak_rate' => 0.365,
                'off_peak_rate' => 0.224,
                'demand_charge' => 45.10, // RM per kW
                'minimum_charge' => 600.00,
                'peak_hours' => array(
                    array('start' => '08:00', 'end' => '22:00') // 8am-10pm weekdays
                )
            ),
            'tariff_d' => array(
                'name' => 'Low Voltage Industrial',
                'rate' => 0.365,
                'minimum_charge' => 7.20
            ),
            'tariff_ds' => array(
                'name' => 'Special Industrial Tariff',
                'rate' => 0.328,
                'minimum_charge' => 7.20
            ),
            'tariff_e1' => array(
                'name' => 'Medium Voltage General Industrial',
                'rate' => 0.329,
                'demand_charge' => 30.30,
                'minimum_charge' => 600.00
            ),
            'tariff_e2' => array(
                'name' => 'Medium Voltage Peak/Off-Peak Industrial',
                'peak_rate' => 0.356,
                'off_peak_rate' => 0.219,
                'demand_charge' => 45.10,
                'minimum_charge' => 600.00,
                'peak_hours' => array(
                    array('start' => '08:00', 'end' => '22:00')
                )
            ),
            'tariff_e2s' => array(
                'name' => 'Special Industrial Tariff (Peak/Off-Peak)',
                'peak_rate' => 0.320,
                'off_peak_rate' => 0.197,
                'demand_charge' => 45.10,
                'minimum_charge' => 600.00,
                'peak_hours' => array(
                    array('start' => '08:00', 'end' => '22:00')
                )
            ),
            'tariff_e3' => array(
                'name' => 'High Voltage Peak/Off-Peak Industrial',
                'peak_rate' => 0.346,
                'off_peak_rate' => 0.212,
                'demand_charge' => 42.00,
                'minimum_charge' => 600.00,
                'peak_hours' => array(
                    array('start' => '08:00', 'end' => '22:00')
                )
            )
        );
    }
    
    private function init_tariff_groups() {
        $this->tariff_groups = array(
            'tariff_a' => array(
                'name' => 'Tariff A - Domestic Tariff',
                'type' => 'domestic',
                'has_voltage_level' => true,
                'has_location' => true,
                'voltage_levels' => array('single_phase', 'three_phase'),
                'single_phase_cap' => 4,
                'three_phase_cap' => 10,
            ),
        );
    }
    
    public function get_tariff_groups() {
        return $this->tariff_groups;
    }
    
    public function get_solar_locations() {
        return $this->solar_irradiance;
    }
    
    private function calculate_monthly_consumption($monthly_bill) {
        $tariff = $this->tnb_rates['tariff_a'];
        $remaining_bill = max(0, $monthly_bill - $tariff['minimum_charge']);
        $consumption = 0;
        
        foreach ($tariff['blocks'] as $block) {
            $block_size = $block['max'] - $block['min'] + 1;
            if ($block['max'] === PHP_INT_MAX) {
                $block_size = 100000;
            }
            
            $block_cost = $block_size * $block['rate'];
            
            if ($remaining_bill >= $block_cost) {
                $consumption += $block_size;
                $remaining_bill -= $block_cost;
            } else {
                $consumption += $remaining_bill / $block['rate'];
                break;
            }
        }
        
        return max(0, $consumption);
    }
    
    private function get_allowed_payment_methods() {
        return array('cash', 'loan', 'credit_installment');
    }

    private function get_settings() {
        return get_option('nem_calculator_settings', array());
    }

    private function get_site_name() {
        $site_name = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);
        return $site_name ? $site_name : 'Solana Tec';
    }

    private function format_number($value, $decimals = 0) {
        return number_format_i18n((float) $value, $decimals);
    }

    private function format_currency($value, $decimals = 2) {
        return 'RM ' . $this->format_number($value, $decimals);
    }

    private function get_voltage_level_label($voltage_level) {
        $labels = array(
            'single_phase' => 'Single Phase',
            'three_phase' => 'Three Phase',
        );

        return isset($labels[$voltage_level]) ? $labels[$voltage_level] : 'Not specified';
    }

    private function get_payment_method_label($mode_of_purchase) {
        $labels = array(
            'cash' => 'Cash',
            'loan' => 'Loan',
            'credit_installment' => 'Credit Installment',
        );

        return isset($labels[$mode_of_purchase]) ? $labels[$mode_of_purchase] : 'Not specified';
    }

    private function get_report_email_subject() {
        $settings = $this->get_settings();
        $subject = isset($settings['report_email_subject']) ? sanitize_text_field($settings['report_email_subject']) : '';
        return $subject ? $subject : 'Your Solar Assessment report is here';
    }

    private function get_admin_notification_subject() {
        $settings = $this->get_settings();
        $subject = isset($settings['admin_notification_subject']) ? sanitize_text_field($settings['admin_notification_subject']) : '';
        return $subject ? $subject : 'New Solana Tec calculator lead';
    }

    private function get_admin_recipient_email() {
        $settings = $this->get_settings();
        $override_email = isset($settings['admin_notification_email']) ? sanitize_email($settings['admin_notification_email']) : '';

        if ($override_email && is_email($override_email)) {
            return $override_email;
        }

        $default_email = get_option('admin_email');
        return is_email($default_email) ? $default_email : '';
    }

    private function get_email_headers($is_html = false) {
        $headers = array();
        $from_email = get_option('admin_email');

        if (is_email($from_email)) {
            $headers[] = 'From: ' . $this->get_site_name() . ' <' . $from_email . '>';
            $headers[] = 'Reply-To: ' . $from_email;
        }

        if ($is_html) {
            $headers[] = 'Content-Type: text/html; charset=UTF-8';
        }

        return $headers;
    }

    private function get_report_email_html($user_email, $results) {
        $site_name = esc_html($this->get_site_name());
        $location = esc_html($results['location_name']);
        $voltage_label = esc_html($this->get_voltage_level_label($results['voltage_level_raw']));
        $payment_label = esc_html($this->get_payment_method_label($results['mode_of_purchase_raw']));
        $user_email = esc_html($user_email);

        return '
            <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
                <h2 style="margin-bottom: 8px;">Your Solar Assessment report is here</h2>
                <p style="margin-top: 0;">Thanks for using ' . $site_name . '. Here is a quick summary of your estimate.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                    <tbody>
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;"><strong>Email</strong></td>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">' . $user_email . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;"><strong>Location</strong></td>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">' . $location . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;"><strong>Voltage Level</strong></td>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">' . $voltage_label . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;"><strong>Payment Method</strong></td>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">' . $payment_label . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;"><strong>Estimated System Size</strong></td>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">' . esc_html($this->format_number($results['system_capacity'], 1)) . ' kWac</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;"><strong>Monthly Generation</strong></td>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">' . esc_html($this->format_number($results['monthly_generation'], 0)) . ' kWh</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;"><strong>Monthly Savings</strong></td>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">' . esc_html($this->format_currency($results['monthly_savings'])) . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;"><strong>Annual Savings</strong></td>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">' . esc_html($this->format_currency($results['annual_savings'])) . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;"><strong>Payback Period</strong></td>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">' . esc_html($this->format_number($results['payback_period'], 1)) . ' years</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;"><strong>25-Year Savings</strong></td>
                            <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">' . esc_html($this->format_currency($results['lifetime_savings'])) . '</td>
                        </tr>
                    </tbody>
                </table>
                <p style="margin-bottom: 8px;"><strong>Disclaimer:</strong> This calculator provides estimates based on the information provided. Actual results may vary. Please consult with Solana Tec team for accurate assessments.</p>
                <p style="margin-top: 0;">If you would like a more personalised recommendation, simply reply to this email or contact the Solana Tec team.</p>
                <p style="margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #4b5563; font-size: 13px;">
                    Powered by <strong>Solana Tec</strong> <strong>#1 JOHOR'S TRUSTED SOLAR ENERGY PARTNER</strong>.
                </p>
            </div>
        ';
    }

    private function get_report_email_text($user_email, $results) {
        $lines = array(
            'Your Solar Assessment report is here',
            '',
            'Email: ' . $user_email,
            'Location: ' . $results['location_name'],
            'Voltage Level: ' . $this->get_voltage_level_label($results['voltage_level_raw']),
            'Payment Method: ' . $this->get_payment_method_label($results['mode_of_purchase_raw']),
            'Estimated System Size: ' . $this->format_number($results['system_capacity'], 1) . ' kWac',
            'Monthly Generation: ' . $this->format_number($results['monthly_generation'], 0) . ' kWh',
            'Monthly Savings: ' . $this->format_currency($results['monthly_savings']),
            'Annual Savings: ' . $this->format_currency($results['annual_savings']),
            'Payback Period: ' . $this->format_number($results['payback_period'], 1) . ' years',
            '25-Year Savings: ' . $this->format_currency($results['lifetime_savings']),
            '',
            'Disclaimer: This calculator provides estimates based on the information provided. Actual results may vary. Please consult with Solana Tec team for accurate assessments.',
            '',
            'Powered by Solana Tec #1 JOHOR''S TRUSTED SOLAR ENERGY PARTNER.',
        );

        return implode("\n", $lines);
    }

    private function get_admin_notification_text($user_email, $results) {
        $calculation_id = !empty($results['calculation_id']) ? intval($results['calculation_id']) : 'N/A';

        $lines = array(
            'A new solar calculator lead was submitted.',
            '',
            'Calculation ID: ' . $calculation_id,
            'Email: ' . $user_email,
            'Location: ' . $results['location_name'],
            'Voltage Level: ' . $this->get_voltage_level_label($results['voltage_level_raw']),
            'Payment Method: ' . $this->get_payment_method_label($results['mode_of_purchase_raw']),
            'Monthly Bill: ' . $this->format_currency($results['monthly_bill']),
            'Estimated System Size: ' . $this->format_number($results['system_capacity'], 1) . ' kWac',
            'Monthly Generation: ' . $this->format_number($results['monthly_generation'], 0) . ' kWh',
            'Monthly Savings: ' . $this->format_currency($results['monthly_savings']),
            'Annual Savings: ' . $this->format_currency($results['annual_savings']),
            'Payback Period: ' . $this->format_number($results['payback_period'], 1) . ' years',
            '25-Year Savings: ' . $this->format_currency($results['lifetime_savings']),
        );

        return implode("\n", $lines);
    }

    private function send_report_email($user_email, $results) {
        if (!is_email($user_email)) {
            return false;
        }

        return (bool) wp_mail(
            $user_email,
            $this->get_report_email_subject(),
            $this->get_report_email_html($user_email, $results),
            $this->get_email_headers(true)
        );
    }

    private function send_admin_notification_email($user_email, $results) {
        $recipient = $this->get_admin_recipient_email();

        if (!$recipient) {
            return false;
        }

        return (bool) wp_mail(
            $recipient,
            $this->get_admin_notification_subject(),
            $this->get_admin_notification_text($user_email, $results),
            $this->get_email_headers(false)
        );
    }
    
    private function get_lead_capture_token_key($calculation_id) {
        return 'nem_lead_capture_' . absint($calculation_id);
    }
    
    private function create_lead_capture_token($calculation_id) {
        $token = wp_generate_password(32, false, false);
        set_transient($this->get_lead_capture_token_key($calculation_id), $token, DAY_IN_SECONDS);
        return $token;
    }
    
    private function get_lead_capture_token($calculation_id) {
        return get_transient($this->get_lead_capture_token_key($calculation_id));
    }
    
    private function clear_lead_capture_token($calculation_id) {
        delete_transient($this->get_lead_capture_token_key($calculation_id));
    }
    
    public function capture_lead() {
        if (!check_ajax_referer('nem_calculator_nonce', 'nonce', false)) {
            wp_send_json_error(array(
                'message' => 'This page needs a quick refresh before we can save your details.'
            ), 403);
            return;
        }

        $calculation_id = isset($_POST['calculation_id']) ? intval(wp_unslash($_POST['calculation_id'])) : 0;
        $capture_token = isset($_POST['capture_token']) ? sanitize_text_field(wp_unslash($_POST['capture_token'])) : '';
        $user_name = isset($_POST['user_name']) ? sanitize_text_field(wp_unslash($_POST['user_name'])) : '';
        $user_phone = isset($_POST['user_phone']) ? sanitize_text_field(wp_unslash($_POST['user_phone'])) : '';
        
        if ($calculation_id <= 0) {
            wp_send_json_error(array(
                'message' => 'Please view your estimate first, then send us your details.'
            ), 400);
            return;
        }
        
        if ('' === $capture_token) {
            wp_send_json_error(array(
                'message' => 'Please refresh the estimate and try again.'
            ), 400);
            return;
        }
        
        if ('' === $user_name || '' === $user_phone) {
            wp_send_json_error(array(
                'message' => 'Please fill in your name and contact number.'
            ), 400);
            return;
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'nem_calculations';
        $stored_token = $this->get_lead_capture_token($calculation_id);
        
        if (!$stored_token || !hash_equals($stored_token, $capture_token)) {
            wp_send_json_error(array(
                'message' => 'This estimate needs to be refreshed before we can save your details.'
            ), 403);
            return;
        }
        
        $calculation = $wpdb->get_row($wpdb->prepare(
            "SELECT id, user_email, user_name, user_phone, lead_status FROM $table_name WHERE id = %d",
            $calculation_id
        ));
        
        if (!$calculation) {
            $this->clear_lead_capture_token($calculation_id);
            wp_send_json_error(array(
                'message' => 'We could not find that estimate anymore. Please run it again.'
            ), 404);
            return;
        }

        if (empty($calculation->user_email) || !is_email($calculation->user_email)) {
            $this->clear_lead_capture_token($calculation_id);
            wp_send_json_error(array(
                'message' => 'Please start again with your email so we can save your estimate properly.'
            ), 409);
            return;
        }

        $already_claimed = !empty($calculation->user_name) || !empty($calculation->user_phone);
        if ($already_claimed) {
            $this->clear_lead_capture_token($calculation_id);
            wp_send_json_error(array(
                'message' => 'Your contact details have already been saved for this estimate.'
            ), 409);
            return;
        }

        $lead_status = ('anonymous' === $calculation->lead_status) ? 'new' : $calculation->lead_status;

        $updated = $wpdb->update(
            $table_name,
            array(
                'user_name' => $user_name,
                'user_phone' => $user_phone,
                'lead_status' => $lead_status
            ),
            array('id' => $calculation_id),
            array('%s', '%s', '%s'),
            array('%d')
        );
        
        if (false === $updated) {
            error_log('NEM Calculator: Lead capture update failed.');
            wp_send_json_error(array(
                'message' => 'We could not save your details just yet. Please try again in a moment.'
            ), 500);
            return;
        }
        
        if (0 === $updated) {
            wp_send_json_error(array(
                'message' => 'We could not confirm your details were saved. Please try again.'
            ), 409);
            return;
        }
        
        $this->clear_lead_capture_token($calculation_id);
        
        wp_send_json_success(array(
            'message' => 'Thanks, your contact details are saved and our team can follow up with you soon.'
        ));
    }
    
    public function calculate_nem() {
        if (!check_ajax_referer('nem_calculator_nonce', 'nonce', false)) {
            wp_send_json_error(array(
                'message' => 'This page needs a quick refresh before we can continue.'
            ), 403);
            return;
        }
        
        if (empty($_POST['monthly_bill'])) {
            wp_send_json_error(array(
                'message' => 'Add your average monthly bill to see your estimate.'
            ), 400);
            return;
        }
        
        try {
            $tariff_group = 'tariff_a';
            $max_demand = 0;
            $user_email = isset($_POST['user_email']) ? sanitize_email(wp_unslash($_POST['user_email'])) : '';
            $monthly_bill = isset($_POST['monthly_bill']) ? floatval(wp_unslash($_POST['monthly_bill'])) : 0;
            $mode_of_purchase = isset($_POST['mode_of_purchase']) ? sanitize_text_field(wp_unslash($_POST['mode_of_purchase'])) : '';
            $solar_rate = 0;
            $voltage_level = isset($_POST['voltage_level']) ? sanitize_text_field(wp_unslash($_POST['voltage_level'])) : '';
            $building_type = '';
            $location = isset($_POST['location']) ? sanitize_text_field(wp_unslash($_POST['location'])) : 'johor_bahru';
            $peak_percentage = 70;
        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => 'A few details look incomplete. Please review them and try again.'
            ), 400);
            return;
        }

        if ('' === $user_email || !is_email($user_email)) {
            wp_send_json_error(array(
                'message' => 'Add a valid email address so we can send your estimate.'
            ), 400);
            return;
        }
        
        if ($monthly_bill <= 0) {
            wp_send_json_error(array(
                'message' => 'Your monthly bill needs to be more than RM 0 for us to build an estimate.'
            ), 400);
            return;
        }
        
        if (!in_array($mode_of_purchase, $this->get_allowed_payment_methods(), true)) {
            wp_send_json_error(array(
                'message' => 'Choose a payment method so we can complete your estimate.'
            ), 400);
            return;
        }
        
        if (!in_array($voltage_level, array('single_phase', 'three_phase'), true)) {
            wp_send_json_error(array(
                'message' => 'Choose your voltage level so we can size the system more accurately.'
            ), 400);
            return;
        }
        
        try {
            if (!isset($this->solar_irradiance[$location])) {
                wp_send_json_error(array(
                    'message' => 'Choose one of the supported locations to continue.'
                ), 400);
                return;
            }
            
            $location_data = $this->solar_irradiance[$location];
            $tariff_data = $this->tnb_rates['tariff_a'];
            
            $system_capacity = ($voltage_level === 'single_phase') ? 4 : 10;
            
            $daily_generation = $system_capacity * $location_data['peak_sun_hours'] * $location_data['efficiency_factor'];
            $monthly_generation = $daily_generation * 30;
            $monthly_consumption = $this->calculate_monthly_consumption($monthly_bill);
            
            $self_consumption = min($monthly_generation, $monthly_consumption);
            $export_to_grid = max(0, $monthly_generation - $monthly_consumption);
            $energy_rate = $this->solar_rates['import_rate']['total']; // RM 0.4944
            
            $self_savings = $self_consumption * $energy_rate;
            $export_earnings = $export_to_grid * $this->solar_rates['export_rate'];
            $monthly_savings = $self_savings + $export_earnings;
            
            $system_cost_per_watt = 4.50;
            $total_system_cost = $system_capacity * 1000 * $system_cost_per_watt;
            $annual_savings = $monthly_savings * 12;
            $payback_period = ($total_system_cost > 0 && $annual_savings > 0)
                ? ($total_system_cost / $annual_savings)
                : 0;
            
            $year_projections = array();
            $cumulative_savings = 0;
            $degradation_rate = 0.005;
            
            for ($year = 1; $year <= 25; $year++) {
                $year_efficiency = 1 - ($degradation_rate * ($year - 1));
                $year_generation = $monthly_generation * 12 * $year_efficiency;
                $year_savings = $year_generation * $energy_rate;
                $cumulative_savings += $year_savings;
                
                $year_projections[] = array(
                    'year' => $year,
                    'generation' => round($year_generation, 0),
                    'savings' => round($year_savings, 2),
                    'cumulative_savings' => round($cumulative_savings, 2),
                    'roi' => ($total_system_cost > 0) ? round(($cumulative_savings / $total_system_cost) * 100, 1) : 0
                );
            }
            
            $monthly_breakdown = array();
            for ($month = 1; $month <= 12; $month++) {
                $monthly_breakdown[] = array(
                    'month' => $month,
                    'generation' => round($monthly_generation, 0),
                    'savings' => round($monthly_savings, 2),
                    'consumption' => round($monthly_consumption, 0)
                );
            }
            
            $results = array(
                'system_capacity' => $system_capacity,
                'location_name' => $location_data['name'],
                'peak_sun_hours' => $location_data['peak_sun_hours'],
                'monthly_generation' => round($monthly_generation, 0),
                'monthly_consumption' => round($monthly_consumption, 0),
                'monthly_bill' => round($monthly_bill, 2),
                'user_email' => $user_email,
                'voltage_level_raw' => $voltage_level,
                'mode_of_purchase_raw' => $mode_of_purchase,
                'monthly_savings' => round($monthly_savings, 2),
                'annual_savings' => round($annual_savings, 2),
                'energy_rate' => round($energy_rate, 3),
                'total_system_cost' => round($total_system_cost, 2),
                'payback_period' => round($payback_period, 1),
                'lifetime_savings' => round($cumulative_savings, 2),
                'year_projections' => $year_projections,
                'monthly_breakdown' => $monthly_breakdown,
                'tariff_type' => $tariff_data['name'],
                'has_peak_offpeak' => false,
                'peak_rate' => 0,
                'offpeak_rate' => 0,
                'voltage_info' => ($voltage_level === 'single_phase')
                    ? 'Single-phase meter (230V, 4 terminals), capped at 4kWac'
                    : 'Three-phase meter (415V, 8 terminals), capped at 10kWac',
                'nem_rates' => array(
                    'import_rate' => $this->solar_rates['import_rate']['total'],
                    'export_rate' => $this->solar_rates['export_rate'],
                    'price_gap' => $this->solar_rates['price_gap'],
                    'import_breakdown' => array(
                        'energy_charge' => $this->solar_rates['import_rate']['energy_charge'],
                        'capacity_charge' => $this->solar_rates['import_rate']['capacity_charge'],
                        'network_charge' => $this->solar_rates['import_rate']['network_charge'],
                        'forecast_afa' => $this->solar_rates['import_rate']['forecast_afa']
                    )
                ),
                'self_consumption' => round($self_consumption, 0),
                'export_to_grid' => round($export_to_grid, 0)
            );
            
            global $wpdb;
            $table_name = $wpdb->prefix . 'nem_calculations';
            
            $user_name = null;
            $user_phone = null;
            
            $inserted = $wpdb->insert(
                $table_name,
                array(
                    'user_email' => $user_email,
                    'user_name' => $user_name,
                    'user_phone' => $user_phone,
                    'tariff_group' => $tariff_group,
                    'location' => $location,
                    'voltage_level' => $voltage_level,
                    'building_type' => $building_type,
                    'max_demand' => $max_demand,
                    'monthly_bill' => $monthly_bill,
                    'mode_of_purchase' => $mode_of_purchase,
                    'solar_rate' => $solar_rate,
                    'peak_percentage' => $peak_percentage,
                    'system_capacity' => $system_capacity,
                    'monthly_generation' => round($monthly_generation, 0),
                    'monthly_savings' => round($monthly_savings, 2),
                    'annual_savings' => round($annual_savings, 2),
                    'payback_period' => round($payback_period, 1),
                    'lifetime_savings' => round($cumulative_savings, 2),
                    'user_ip' => isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : '',
                    'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT'])) : '',
                    'lead_status' => 'new'
                ),
                array(
                    '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%f', '%f', '%s', '%f', '%d',
                    '%f', '%d', '%f', '%f', '%f', '%f', '%s', '%s', '%s'
                )
            );
            
            if (false === $inserted && !empty($wpdb->last_error)) {
                error_log('NEM Calculator: Database insert failed.');
            }
            
            $results['calculation_id'] = $inserted ? intval($wpdb->insert_id) : 0;
            $results['capture_token'] = $inserted ? $this->create_lead_capture_token($wpdb->insert_id) : '';
            $report_email_sent = $this->send_report_email($user_email, $results);
            $results['email_status'] = $report_email_sent ? 'sent' : 'failed';
            $results['email_message'] = $report_email_sent
                ? 'Your Solar Assessment report has been emailed to ' . $user_email . '.'
                : 'Your estimate is ready below. We could not send the email just now, so please review it here for now.';

            if (!$report_email_sent) {
                error_log('NEM Calculator: Estimate report email could not be sent.');
            }

            $admin_notification_sent = $this->send_admin_notification_email($user_email, $results);
            if (!$admin_notification_sent) {
                error_log('NEM Calculator: Admin notification email could not be sent.');
            }
            
            wp_send_json_success($results);
        
        } catch (Exception $e) {
            error_log('NEM Calculator: Calculation failed - ' . $e->getMessage());
            wp_send_json_error(array(
                'message' => 'We could not prepare your estimate just yet. Please try again in a moment.'
            ), 500);
        }
    }
}
