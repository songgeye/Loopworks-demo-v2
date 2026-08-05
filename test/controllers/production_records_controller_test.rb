require "test_helper"

class ProductionRecordsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get production_records_index_url
    assert_response :success
  end

  test "should get new" do
    get production_records_new_url
    assert_response :success
  end

  test "should get show" do
    get production_records_show_url
    assert_response :success
  end

  test "should get edit" do
    get production_records_edit_url
    assert_response :success
  end
end
