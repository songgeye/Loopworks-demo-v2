class CreateStaffs < ActiveRecord::Migration[7.2]
  def change
    create_table :staffs do |t|
      t.string :login_id, null: false
      t.string :name, null: false
      t.string :role, null: false
      t.string :password_digest, null: false
      t.datetime :deleted_at

      t.timestamps
    end
    add_index :staffs, :login_id, unique: true
    add_index :staffs, :deleted_at
  end
end
