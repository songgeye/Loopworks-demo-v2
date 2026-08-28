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

ActiveRecord::Schema[7.2].define(version: 2026_08_23_174612) do
  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "companies", force: :cascade do |t|
    t.string "name", null: false
    t.boolean "supplier", default: false, null: false
    t.boolean "buyer", default: false, null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["buyer"], name: "index_companies_on_buyer"
    t.index ["deleted_at"], name: "index_companies_on_deleted_at"
    t.index ["supplier"], name: "index_companies_on_supplier"
  end

  create_table "inventory_movements", force: :cascade do |t|
    t.integer "material_id", null: false
    t.integer "movement_type", null: false
    t.decimal "quantity_kg", precision: 12, scale: 2, null: false
    t.datetime "occurred_at", null: false
    t.string "source_type"
    t.integer "source_id"
    t.text "note"
    t.integer "created_by_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_inventory_movements_on_created_by_id"
    t.index ["material_id", "occurred_at"], name: "index_inventory_movements_on_material_id_and_occurred_at"
    t.index ["material_id"], name: "index_inventory_movements_on_material_id"
    t.index ["source_type", "source_id"], name: "index_inventory_movements_on_source"
  end

  create_table "materials", force: :cascade do |t|
    t.string "name", null: false
    t.integer "display_order", null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "category", default: 0, null: false
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
    t.integer "purchase_slip_id"
    t.index ["deleted_at"], name: "index_production_records_on_deleted_at"
    t.index ["material_id"], name: "index_production_records_on_material_id"
    t.index ["purchase_slip_id"], name: "index_production_records_on_purchase_slip_id"
    t.index ["recorded_at"], name: "index_production_records_on_recorded_at"
    t.index ["staff_id"], name: "index_production_records_on_staff_id"
    t.index ["status"], name: "index_production_records_on_status"
  end

  create_table "purchase_slips", force: :cascade do |t|
    t.integer "company_id", null: false
    t.integer "contact_id"
    t.datetime "received_at", null: false
    t.string "slip_no"
    t.decimal "declared_total_kg", precision: 10, scale: 2
    t.text "note"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["company_id", "received_at"], name: "index_purchase_slips_on_company_id_and_received_at"
    t.index ["company_id"], name: "index_purchase_slips_on_company_id"
    t.index ["contact_id"], name: "index_purchase_slips_on_contact_id"
    t.index ["deleted_at"], name: "index_purchase_slips_on_deleted_at"
  end

  create_table "purchasers", force: :cascade do |t|
    t.integer "company_id", null: false
    t.string "name", null: false
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["company_id"], name: "index_purchasers_on_company_id"
    t.index ["deleted_at"], name: "index_purchasers_on_deleted_at"
  end

  create_table "shipment_items", force: :cascade do |t|
    t.integer "shipment_id", null: false
    t.integer "material_id", null: false
    t.decimal "quantity_kg", precision: 12, scale: 2, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["material_id"], name: "index_shipment_items_on_material_id"
    t.index ["shipment_id"], name: "index_shipment_items_on_shipment_id"
  end

  create_table "shipments", force: :cascade do |t|
    t.integer "company_id", null: false
    t.datetime "shipped_at", null: false
    t.string "slip_no"
    t.text "note"
    t.datetime "deleted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["company_id"], name: "index_shipments_on_company_id"
    t.index ["deleted_at"], name: "index_shipments_on_deleted_at"
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

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "inventory_movements", "materials"
  add_foreign_key "inventory_movements", "staffs", column: "created_by_id"
  add_foreign_key "production_records", "materials"
  add_foreign_key "production_records", "purchase_slips"
  add_foreign_key "production_records", "staffs"
  add_foreign_key "purchase_slips", "companies"
  add_foreign_key "purchase_slips", "purchasers", column: "contact_id"
  add_foreign_key "purchasers", "companies"
  add_foreign_key "shipment_items", "materials"
  add_foreign_key "shipment_items", "shipments"
  add_foreign_key "shipments", "companies"
end
