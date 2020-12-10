import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';

import { I18n } from 'shoutem.i18n';
import {
  NavigationBar,
  closeModal,
  openInModal,
} from 'shoutem.navigation';

import { connectStyle } from '@shoutem/theme';
import {
  Caption,
  Divider,
  Icon,
  ListView,
  Screen,
  ScrollView,
  Title,
  Subtitle,
  TouchableOpacity,
  View,
} from '@shoutem/ui';

import CartFooter from '../components/CartFooter';
import CartItem from '../components/CartItem';
import {
  cart as cartShape,
  shop as shopShape,
} from '../components/shapes';
import {
  cartItemRemoved,
  cartItemUpdated,
  startCheckout,
} from '../redux/actionCreators';
import { ext } from '../const';
import UpdateItemScreen from './UpdateItemScreen';

const { func } = PropTypes;

/**
 * Displays a list of items that the user has added to his cart, the total price, and
 * a button that lets him proceed to checkout
 */
class CartScreen extends PureComponent {
  static propTypes = {
    // A list of cart items, where an item is defined by a combination of product, its variant
    // and quantity
    cart: cartShape.isRequired,
    // Action dispatched when an item is removed from the cart
    cartItemRemoved: func.isRequired,
    // Action dispatched when a cart item is updated
    cartItemUpdated: func.isRequired,
    // Used to close modal after a cart item has been updated
    closeModal: func,
    // Used to open the edit cart item screen in modal
    openInModal: func,
    // Shop properties, currently used just to display currency
    shop: shopShape.isRequired,
    // Dispatched when the user starts a checkout
    startCheckout: func.isRequired,
  };

  constructor(props) {
    super(props);

    this.proceedToCheckout = this.proceedToCheckout.bind(this);
    this.renderRow = this.renderRow.bind(this);

    this.state = {
      selectedItem: null
    };
  }

  onItemUpdated(actionType, cartItem, updates) {
    const { cartItemRemoved, cartItemUpdated, closeModal } = this.props;
    const { remove } = UpdateItemScreen.actionTypes;

    if (actionType === remove) {
      cartItemRemoved(cartItem);
    } else {
      const { variant: newVariant, quantity } = updates;

      cartItemUpdated(cartItem, newVariant, quantity);
    }

    closeModal();
  }

  onEditItem(cartItem) {
    const { openInModal } = this.props;

    const { item, variant, quantity } = cartItem;
    const route = {
      screen: ext('UpdateItemScreen'),
      props: {
        item,
        variant,
        quantity,
        onActionButtonClicked: (actionType, updates) =>
          this.onItemUpdated(actionType, cartItem, updates),
      },
    };
    openInModal(route);
  }

  proceedToCheckout() {
    const { cart, startCheckout } = this.props;

    startCheckout(cart);
  }

  renderRow(cartItem) {
    const { shop } = this.props;

    return (
      <TouchableOpacity onPress={() => this.onEditItem(cartItem)}>
        <CartItem cartItem={cartItem} shop={shop} />
        <Divider styleName="line" />
      </TouchableOpacity>
    );
  }

  renderContent() {
    const { cart } = this.props;

    return (
      <ScrollView>
        <Divider styleName="section-header">
          <Caption>{I18n.t(ext('cartScreenProductName'))}</Caption>
          <Caption>{I18n.t(ext('cartScreenProductPrice'))}</Caption>
        </Divider>
        <ListView
          data={cart}
          renderRow={this.renderRow}
        />
        <Divider styleName="line" />
        <CartFooter
          action={I18n.t(ext('proceedToCheckoutButton'))}
          onActionButtonClicked={this.proceedToCheckout}
        />
      </ScrollView>
    );
  }

  render() {
    const { cart } = this.props;

    return (
      <Screen>
        <NavigationBar title={I18n.t(ext('cartScreenNavBarTitle'))} />
        { _.size(cart) ? this.renderContent() : renderEmptyScreen()}
      </Screen>
    );
  }
}

const renderEmptyScreen = () => (
  <View styleName="flexible vertical h-center v-center xl-gutter-horizontal">
    <View styleName="oval-highlight">
      <Icon name="cart" />
    </View>
    <Subtitle styleName="h-center md-gutter-top xl-gutter-horizontal">
      {I18n.t(ext('emptyCartMessage'))}
    </Subtitle>
  </View>
);

const mapStateToProps = (state) => {
  const { cart, shop } = state[ext()];

  return {
    cart,
    shop,
  };
};

const mapDispatchToProps = {
  cartItemRemoved,
  cartItemUpdated,
  closeModal,
  openInModal,
  startCheckout,
};

export default connect(mapStateToProps, mapDispatchToProps)(
  connectStyle(ext('CartScreen'))(CartScreen),
);
