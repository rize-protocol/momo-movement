module momo_movement::momo_coin {
    use std::signer;
    use std::string::utf8;
    use aptos_framework::aptos_account;
    use aptos_framework::coin;

    friend momo_movement::momo;

    #[test_only]
    use aptos_framework::account;

    struct Coin {}

    struct CoinCapabilities has key {
        mint: coin::MintCapability<Coin>,
        freeze: coin::FreezeCapability<Coin>,
        burn: coin::BurnCapability<Coin>,
    }

    fun init_module(sender: &signer) {
        let (burn, freeze, mint) = coin::initialize<Coin>(
            sender,
            utf8(b"MoMo Point"),
            utf8(b"MomoPoint"),
            6,
            true
        );
        move_to(sender, CoinCapabilities {
            mint,
            freeze,
            burn,
        });
    }

    public(friend) fun mint_internal(receipt: &signer, amount: u64) acquires CoinCapabilities {
        let receipt_addr = signer::address_of(receipt);

        let capabilities = borrow_global<CoinCapabilities>(@momo_movement);
        let coin = coin::mint<Coin>(amount, &capabilities.mint);

        try_register_coin(receipt);
        coin::deposit(receipt_addr, coin);
    }

    public(friend) fun transfer_internal(from: &signer, to: address, amount: u64) {
        aptos_account::transfer_coins<Coin>(from, to, amount);
    }

    fun try_register_coin(sender: &signer) {
        let sender_addr = signer::address_of(sender);
        if (!coin::is_account_registered<Coin>(sender_addr)) {
            coin::register<Coin>(sender);
        }
    }

    #[test(deployer=@momo_movement)]
    fun test_init(deployer: &signer) {
        init_for_testing(deployer);
        assert!(exists<CoinCapabilities>(signer::address_of(deployer)), 0);
    }

    #[test(deployer=@momo_movement)]
    fun test_mint(deployer: &signer) acquires CoinCapabilities {
        init_for_testing(deployer);
        let balance_before_mint = coin::balance<Coin>(signer::address_of(deployer));
        assert!(balance_before_mint == 0, 0);

        let amount = 100_000_000;
        mint_internal(deployer, amount);

        let balance_after_mint = coin::balance<Coin>(signer::address_of(deployer));
        assert!(balance_after_mint == amount, 1);
    }

    #[test_only]
    public fun init_for_testing(sender: &signer) {
        if (!account::exists_at(signer::address_of(sender))) {
            account::create_account_for_test(signer::address_of(sender));
        };
        init_module(sender);
    }
}