<?php
/*
Plugin Name: My Inspection Form
Description: پلاگین فرم بازرسی مدیریت مصرف برق برای ذخیره داده‌ها در دیتابیس.
Version: 1.1
Author: Your Name
*/

if (!defined('ABSPATH')) {
    exit; // جلوگیری از دسترسی مستقیم
}

// 🔧 ایجاد جدول هنگام فعال‌سازی
function my_inspection_form_install() {
    global $wpdb;
    $table = $wpdb->prefix . 'inspection_forms';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS $table (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        inspector VARCHAR(255),
        tariff VARCHAR(255),
        office VARCHAR(255),
        bill_id VARCHAR(20),
        meter_serial VARCHAR(20),
        center_name VARCHAR(255),
        center_activity VARCHAR(255),
        visit_date VARCHAR(20),
        visit_time VARCHAR(10),
        previous_visit_date VARCHAR(20),
        address TEXT,
        latitude VARCHAR(20),
        longitude VARCHAR(20),
        energy_manager VARCHAR(255),
        energy_manager_phone VARCHAR(20),
        total_consumption VARCHAR(255),
        checklist_questions TEXT,
        checklist_explanations TEXT,
        inspector_signature LONGTEXT,
        center_manager_signature LONGTEXT,
        photos TEXT,
        videos TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) $charset_collate;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
}
register_activation_hook(__FILE__, 'my_inspection_form_install');

// 📦 بارگذاری اسکریپت‌ها و استایل‌ها
function my_inspection_form_enqueue_scripts() {
    wp_enqueue_style('my-style', plugin_dir_url(__FILE__) . 'css/style.css');
    wp_enqueue_style('persian-datepicker', plugin_dir_url(__FILE__) . 'css/persian-datepicker.min.css');

    wp_enqueue_script('jquery');
    wp_enqueue_script('persian-date', plugin_dir_url(__FILE__) . 'js/persian-date.min.js', [], null, true);
    wp_enqueue_script('persian-datepicker', plugin_dir_url(__FILE__) . 'js/persian-datepicker.min.js', ['persian-date'], null, true);
    wp_enqueue_script('signature-pad', plugin_dir_url(__FILE__) . 'js/signature_pad.umd.min.js', [], null, true);
    // wp_enqueue_script('my-script', plugin_dir_url(__FILE__) . 'js/script.js', ['jquery'], null, true);

    wp_localize_script('my-script', 'myInspectionFormAjax', [
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('my_inspection_form_nonce'),
    ]);
}
add_action('wp_enqueue_scripts', 'my_inspection_form_enqueue_scripts');

// 📄 شورت‌کد برای نمایش فرم
function my_inspection_form_shortcode() {
    ob_start();
    include plugin_dir_path(__FILE__) . 'form-template.html';
    return ob_get_clean();
}
add_shortcode('my_inspection_form', 'my_inspection_form_shortcode');

// 🚀 پردازش AJAX
function my_inspection_form_process_data() {
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'my_inspection_form_nonce')) {
        wp_send_json_error(['message' => 'خطای امنیتی: Nonce نامعتبر است.']);
    }

    global $wpdb;
    $table = $wpdb->prefix . 'inspection_forms';

    // 1. دریافت و پاک‌سازی فیلدهای متنی
    $fields = ['inspector','tariff','office','bill_id','meter_serial','center_name','center_activity',
        'visit_date','visit_time','previous_visit_date','address','latitude','longitude',
        'energy_manager','energy_manager_phone','total_consumption'];

    $data = [];
    foreach ($fields as $f) {
        $data[$f] = sanitize_text_field($_POST[$f] ?? '');
    }

    // 2. امضاها
    $data['inspector_signature'] = wp_kses_post($_POST['inspectorSignature'] ?? '');
    $data['center_manager_signature'] = wp_kses_post($_POST['centerManagerSignature'] ?? '');
    if (!$data['inspector_signature'] || !$data['center_manager_signature']) {
        wp_send_json_error(['message' => 'امضاها باید ثبت شوند.']);
    }

    // 3. چک‌لیست سؤالات
    $questions = $explanations = [];
    for ($i = 1; $i <= 11; $i++) {
        $q = 'q' . $i;
        $exp = 'exp_q' . $i;
        if (isset($_POST[$q])) $questions[$q] = sanitize_text_field($_POST[$q]);
        if (isset($_POST[$exp])) $explanations[$exp] = sanitize_textarea_field($_POST[$exp]);
    }
    $data['checklist_questions'] = wp_json_encode($questions);
    $data['checklist_explanations'] = wp_json_encode($explanations);

    // 4. آپلود عکس‌ها
    $data['photos'] = '';
    if (!empty($_FILES['photos']['name'][0])) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        $uploaded = [];
        foreach ($_FILES['photos']['name'] as $i => $name) {
            $file = [
                'name' => $_FILES['photos']['name'][$i],
                'type' => $_FILES['photos']['type'][$i],
                'tmp_name' => $_FILES['photos']['tmp_name'][$i],
                'error' => $_FILES['photos']['error'][$i],
                'size' => $_FILES['photos']['size'][$i],
            ];
            $upload = wp_handle_upload($file, ['test_form' => false]);
            if (!empty($upload['url'])) $uploaded[] = esc_url_raw($upload['url']);
        }
        $data['photos'] = wp_json_encode($uploaded);
    }

    // 5. آپلود ویدیوها
    $data['videos'] = '';
    if (!empty($_FILES['videos']['name'][0])) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        $uploaded = [];
        foreach ($_FILES['videos']['name'] as $i => $name) {
            $file = [
                'name' => $_FILES['videos']['name'][$i],
                'type' => $_FILES['videos']['type'][$i],
                'tmp_name' => $_FILES['videos']['tmp_name'][$i],
                'error' => $_FILES['videos']['error'][$i],
                'size' => $_FILES['videos']['size'][$i],
            ];
            $upload = wp_handle_upload($file, ['test_form' => false]);
            if (!empty($upload['url'])) $uploaded[] = esc_url_raw($upload['url']);
        }
        $data['videos'] = wp_json_encode($uploaded);
    }

    // 6. ذخیره در دیتابیس
    $result = $wpdb->insert($table, $data);

    if ($result) {
        wp_send_json_success(['message' => '✅ فرم با موفقیت ثبت شد.']);
    } else {
        wp_send_json_error(['message' => '❌ خطا در ثبت فرم.', 'sql_error' => $wpdb->last_error]);
    }

    wp_die();
}
add_action('wp_ajax_my_inspection_form_process_data', 'my_inspection_form_process_data');
add_action('wp_ajax_nopriv_my_inspection_form_process_data', 'my_inspection_form_process_data');
