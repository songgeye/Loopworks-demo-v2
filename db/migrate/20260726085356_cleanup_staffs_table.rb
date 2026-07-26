class CleanupStaffsTable < ActiveRecord::Migration[7.2]
  def change
    remove_column :staffs, :password_digest
    rename_column :staffs, :login_id, :username
  end
end
