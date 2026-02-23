# backend/core/domains/products/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class ProductsBaseException(APIException):
    """Base exception for products domain"""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "An error occurred in the products domain."
    default_code = "products_error"


class ProductNotFound(ProductsBaseException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Product not found."
    default_code = "product_not_found"


class CategoryNotFound(ProductsBaseException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Category not found."
    default_code = "category_not_found"


class DiscountNotFound(ProductsBaseException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Discount not found."
    default_code = "discount_not_found"


class DiscountCodeExists(ProductsBaseException):
    default_detail = "A discount with this code already exists."
    default_code = "discount_code_exists"


class InvalidDiscountValue(ProductsBaseException):
    default_detail = "Invalid discount value."
    default_code = "invalid_discount_value"

    def __init__(self, detail=None):
        if detail:
            self.detail = detail
        super().__init__()


class InvalidDateRange(ProductsBaseException):
    default_detail = "Valid until date must be after valid from date."
    default_code = "invalid_date_range"


class CategoryHasProducts(ProductsBaseException):
    default_detail = "Cannot delete category that contains products."
    default_code = "category_has_products"


class CategoryHasChildren(ProductsBaseException):
    default_detail = "Cannot delete category that has subcategories."
    default_code = "category_has_children"


class CircularCategoryReference(ProductsBaseException):
    default_detail = "Circular category reference detected."
    default_code = "circular_category_reference"


class ProductInUse(ProductsBaseException):
    default_detail = "Cannot delete product that is in use."
    default_code = "product_in_use"


class DiscountNotApplicable(ProductsBaseException):
    default_detail = "Discount is not applicable to the selected items."
    default_code = "discount_not_applicable"


class DiscountExpired(ProductsBaseException):
    default_detail = "Discount has expired."
    default_code = "discount_expired"


class DiscountUsageLimitReached(ProductsBaseException):
    default_detail = "Discount usage limit has been reached."
    default_code = "discount_usage_limit_reached"


class MinimumOrderRequirementNotMet(ProductsBaseException):
    default_detail = "Minimum order requirements not met for this discount."
    default_code = "minimum_order_requirement_not_met"
