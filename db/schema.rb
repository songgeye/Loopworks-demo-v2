# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2026_07_26_085356) do
  create_table "materials", force: :cascade do |t|
    t.string "name", null: false
    t.integer "display_order", null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["deleted_at"], name: "index_materials_on_deleted_at"
  end

  create_table "production_records", force: :cascade do |t|
    t.datetime "recorded_at", null: false
    t.integer "material_id", null: false
    t.decimal "weight_kg", null: false
    t.integer "staff_id", null: false
    t.string "status", default: "published", null: false
    t.text "note"
    t.boolean "flagged_as_anomaly", default: false, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["deleted_at"], name: "index_production_records_on_deleted_at"
    t.index ["material_id"], name: "index_production_records_on_material_id"
    t.index ["recorded_at"], name: "index_production_records_on_recorded_at"
    t.index ["staff_id"], name: "index_production_records_on_staff_id"
    t.index ["status"], name: "index_production_records_on_status"
  end

  create_table "staffs", force: :cascade do |t|
    t.string "username", null: false
    t.string "name", null: false
    t.string "role", null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "encrypted_password", default: "", null: false
    t.datetime "remember_created_at"
    t.index ["deleted_at"], name: "index_staffs_on_deleted_at"
    t.index ["username"], name: "index_staffs_on_username", unique: true
  end

  add_foreign_key "production_records", "materials"
  add_foreign_key "production_records", "staffs"
end
