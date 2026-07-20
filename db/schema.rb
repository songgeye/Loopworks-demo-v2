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

ActiveRecord::Schema[7.2].define(version: 2026_07_12_161904) do
  create_table "materials", force: :cascade do |t|
    t.string "name"
    t.integer "display_order"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "production_records", force: :cascade do |t|
    t.datetime "recorded_at"
    t.integer "material_id", null: false
    t.decimal "weight_kg"
    t.integer "staff_id", null: false
    t.string "status"
    t.text "note"
    t.boolean "flagged_as_anomaly"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["material_id"], name: "index_production_records_on_material_id"
    t.index ["staff_id"], name: "index_production_records_on_staff_id"
  end

  create_table "staffs", force: :cascade do |t|
    t.string "login_id"
    t.string "name"
    t.string "role"
    t.string "password_digest"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_foreign_key "production_records", "materials"
  add_foreign_key "production_records", "staffs"
end
