// niente finestra del terminale su Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    iris_volto_lib::run()
}
