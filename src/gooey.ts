export interface GooeyConfig {
  language: string;
  target: string;
  suppress_gooey_flag: boolean;
  program_name: string;
  program_description: string;
  sidebar_title: string;
  default_size?: (number)[] | null;
  auto_start: boolean;
  show_advanced: boolean;
  run_validators: boolean;
  encoding: string;
  show_stop_warning: boolean;
  show_success_modal: boolean;
  show_failure_modal: boolean;
  force_stop_is_error: boolean;
  poll_external_updates: boolean;
  return_to_config: boolean;
  show_restart_button: boolean;
  requires_shell: boolean;
  menu?: (null)[] | null;
  clear_before_run: boolean;
  fullscreen: boolean;
  use_legacy_titles: boolean;
  num_required_cols: number;
  num_optional_cols: number;
  manual_start: boolean;
  monospace_display: boolean;
  image_dir: string;
  language_dir: string;
  progress_regex?: null;
  progress_expr?: null;
  hide_progress_msg: boolean;
  timing_options: TimingOptions;
  disable_progress_bar_animation: boolean;
  disable_stop_button: boolean;
  navigation: string;
  show_sidebar: boolean;
  tabbed_groups: boolean;
  group_by_type: boolean;
  body_bg_color: string;
  header_bg_color: string;
  header_height: number;
  header_show_title: boolean;
  header_show_subtitle: boolean;
  header_image_center: boolean;
  footer_bg_color: string;
  sidebar_bg_color: string;
  terminal_panel_color: string;
  terminal_font_color: string;
  terminal_font_family?: null;
  terminal_font_weight: number;
  terminal_font_size?: null;
  richtext_controls: boolean;
  error_color: string;
  layout: string;
  widgets: Widgets;
}
export interface TimingOptions {
  show_time_remaining: boolean;
  hide_time_remaining_on_complete: boolean;
}
export interface Widgets {
  dreambooth: Dreambooth;
}
export interface Dreambooth {
  command: string;
  name: string;
  help?: null;
  description: string;
  contents?: (FieldGroup)[] | null;
}
export interface FieldGroup {
  name: string;
  items?: (Field)[] | null;
  groups?: (null)[] | null;
  description: string;
  options: Options;
}
export interface Field {
  id: string;
  type: string;
  cli_type: string;
  required: boolean;
  data: Data;
  options: Options1;
}
export interface Data {
  display_name: string;
  help?: string | null;
  required: boolean;
  nargs: string;
  commands?: (string)[] | null;
  choices?: (string | null)[] | null;
  default: string | number | boolean | number | number | boolean | string | number | boolean | string | boolean | null;
  dest: string;
}
export interface Options1 {
  error_color: string;
  label_color: string;
  help_color: string;
  full_width: boolean;
  validator: Validator;
  external_validator: ExternalValidator;
}
export interface Validator {
  type: string;
  test: string;
  message: string;
}
export interface ExternalValidator {
  cmd: string;
}
export interface Options {
  label_color: string;
  description_color: string;
  legacy: Legacy;
  columns: number;
  padding: number;
  show_border: boolean;
}
export interface Legacy {
  required_cols: number;
  optional_cols: number;
}
