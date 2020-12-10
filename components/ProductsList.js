import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import autoBindReact from 'auto-bind/react';
import { connect } from 'react-redux';
import _ from 'lodash';

import { I18n } from 'shoutem.i18n';

import {
  find,
  isBusy,
  shouldRefresh,
  getCollection
} from '@shoutem/redux-io';
import { connectStyle } from '@shoutem/theme';
import { EmptyStateView, ListView, Screen, Text } from '@shoutem/ui';

import { getActiveShortcut } from 'shoutem.application';
import {
  navigateTo,
  closeModal,
  openInModal,
} from 'shoutem.navigation';

import {
  cartItemAdded,
  refreshProducts,
} from '../redux/actionCreators';
import { getProducts } from '../redux/selectors';
import UpdateItemScreen from '../screens/UpdateItemScreen';
import { ext, PAGE_SIZE } from '../const';
import FeaturedItem from './FeaturedItem';
import ListItem from './ListItem';
import {
  product as productShape,
  shop as shopShape,
} from './shapes';


const { arrayOf, bool, func, number, shape, string } = PropTypes;

/**
 * A component that displays a list of products,
 * used in the main products screen and search
 * screen. Lets the user navigate to product
 * details or add a product to cart.
 */
export class ProductsList extends PureComponent {
  static propTypes = {
    // Action dispatched when a product is added to the cart
    cartItemAdded: func.isRequired,
    // Used to close modal after an item has been added to the cart
    closeModal: func,
    // Collection ID for which products are displayed
    collectionId: string,
    // Used to navigate to the product details screen after a product
    // is selected
    navigateTo: func.isRequired,
    // Used to open the add to cart screen in modal
    openInModal: func,
    productsState: shape({
      // Used to display a loading status when fetching new products
      isLoading: bool,
      // Has fetching products failed with an error
      error: bool,
      // Products displayed in this list for its collection ID or tag
      products: arrayOf(productShape),
    }),
    // Called when reaching the end of the list to load more products or
    // to refresh them completely
    refreshProducts: func.isRequired,
    // Shop properties, currently used just to display currency
    shop: shopShape.isRequired,
    // Product tag for which products are displayed
    tag: string,
  };

  constructor(props) {
    super(props);

    autoBindReact(this);

    this.state = { selectedItem: null };
  }

  componentDidMount() {
    const { shop: { error } } = this.props;

    if (error) {
      return;
    }

    this.refreshData();
  }

  onAddToCart(item) {
    const { openInModal } = this.props;

    // featured item is received as array, bug with @shoutem/ui
    const resolvedItem = Array.isArray(item) ? item[0] : item;
    const { add } = UpdateItemScreen.actionTypes;

    const route = {
      screen: ext('UpdateItemScreen'),
      props: {
        actionType: add,
        item: resolvedItem,
        onActionButtonClicked: (type, { variant, quantity }) =>
          this.addItemToCart(resolvedItem, variant, quantity),
      },
    };

    openInModal(route);
  }

  onLoadMore() {
    const { products } = this.props.productsState;

    if (_.size(products) < PAGE_SIZE) {
      return;
    }

    this.refreshData();
  }

  getNoProductsView() {
    return (
      <EmptyStateView
        icon="refresh"
        message={I18n.t(ext('noItemsInCollection'))}
        retryButtonTitle={I18n.t('shoutem.application.tryAgainButton')}
        onRetry={() => this.refreshData(true)}
      />
    );
  }

  getNoProductsForTagView() {
    const { tag } = this.props;

    const message = `${I18n.t(ext('noItemsWithSpecificTag'))}"${tag}".`;

    return (
      <EmptyStateView
        icon="search"
        message={message}
      />
    );
  }

  navigateToProductDetails(item) {
    const { navigateTo } = this.props;

    // featured item is received as array, bug with @shoutem/ui
    const resolvedItem = Array.isArray(item) ? item[0] : item;

    navigateTo({
      screen: ext('ProductDetailsScreen'),
      props: {
        productId: resolvedItem.id,
      },
    });
  }

  // Called to load more products when the component is mounted or
  // the list scrolled beyond visible items
  refreshData(resetMode) {
    const { collectionId, refreshProducts, tag } = this.props;
    refreshProducts(collectionId, tag, resetMode);
  }

  addItemToCart(item, variant, quantity) {
    const { cartItemAdded, closeModal } = this.props;

    cartItemAdded({ item, variant, quantity });
    closeModal();
  }

  renderFeaturedProduct(item) {
    const { shop } = this.props;

    // featured item is received as array, bug with @shoutem/ui
    const resolvedItem = Array.isArray(item) ? item[0] : item;

    return resolvedItem ? (
      <FeaturedItem
        item={resolvedItem}
        onAddToCart={() => this.onAddToCart(resolvedItem)}
        onPress={() => this.navigateToProductDetails(resolvedItem)}
        shop={shop}
      />
    ) : null;
  }

  renderProductRow(item) {
    if (!item) return null;

    const { shop } = this.props;

    return (
      <ListItem
        item={item}
        onAddToCart={() => this.onAddToCart(item)}
        onPress={() => this.navigateToProductDetails(item)}
        shop={shop}
      />
    );
  }

  renderEmptyScreen() {
    const { tag } = this.props;

    return tag ? this.getNoProductsForTagView() : this.getNoProductsView();
  }

  renderProducts(products, isLoading) {
    const { hasFeaturedItem } = this.props;

    return (
      <ListView
        data={products}
        loading={isLoading}
        onLoadMore={this.onLoadMore}
        onRefresh={() => this.refreshData(true)}
        renderRow={this.renderProductRow}
        hasFeaturedItem={hasFeaturedItem}
        renderFeaturedItem={(item) => this.renderFeaturedProduct(item)}
      />
    );
  }

  renderContent() {
    const { productsState, shop } = this.props;
    const { isLoading: productsLoading, products } = productsState;
    const { isLoading: shopLoading } = shop;

    const isLoading = productsLoading || shopLoading;

    return isLoading || _.size(products) ?
      this.renderProducts(products, isLoading) :
      this.renderEmptyScreen();
  }

  render() {
    const { shop: { error } } = this.props;

    if (error) {
      const message = I18n.t(ext('fetchingShopErrorMessage'));

      return <EmptyStateView message={message} />;
    }

    return (
      <Screen>
        {this.renderContent()}
      </Screen>
    );
  }
}

export const mapStateToProps = (state, ownProps) => {
  const { shop } = state[ext()];
  const { collectionId, tag } = ownProps;

  const productsState = getProducts(state, collectionId, tag);
  const activeShortcut = getActiveShortcut(state);
  const screens = _.get(activeShortcut, 'screens');
  const activeScreen = screens ? screens[0] : null;
  const hasFeaturedItem = _.get(activeScreen, 'settings.hasFeaturedItem', false);
  const listType = _.get(activeScreen, 'settings.listType', 'list');

  return {
    hasFeaturedItem,
    listType,
    productsState,
    shop,
  };
};

export const mapDispatchToProps = {
  cartItemAdded,
  closeModal,
  find,
  navigateTo,
  openInModal,
  refreshProducts,
};

export default connect(mapStateToProps, mapDispatchToProps)(
  connectStyle(ext('ProductsList'))(ProductsList),
);
