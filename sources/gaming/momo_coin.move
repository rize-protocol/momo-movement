module movement_gaming::momo_coin {
    use std::signer;
    use std::string::utf8;
    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::event;

    friend movement_gaming::gaming;

    struct Coin {}

    struct MintEvent has drop, store {
        receipt: address,
        amount: u64
    }

    struct TransferEvent has drop, store {
        from: address,
        to: address,
        amount: u64
    }

    struct CoinCapabilities has key {
        mint: coin::MintCapability<Coin>,
        freeze: coin::FreezeCapability<Coin>,
        burn: coin::BurnCapability<Coin>,

        mint_events: event::EventHandle<MintEvent>,
        transfer_events: event::EventHandle<TransferEvent>,
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

            mint_events: account::new_event_handle<MintEvent>(sender),
            transfer_events: account::new_event_handle<TransferEvent>(sender),
        });
    }

    public(friend) fun mint_to(receipt: &signer, amount: u64)  acquires CoinCapabilities {
        let receipt_addr = signer::address_of(receipt);

        let capabilities = borrow_global_mut<CoinCapabilities>(@movement_gaming);
        let coin = coin::mint<Coin>(amount, &capabilities.mint);

        try_register_coin(receipt);
        coin::deposit(receipt_addr, coin);

        event::emit_event<MintEvent>(&mut capabilities.mint_events, MintEvent {
            receipt: receipt_addr,
            amount,
        })
    }

    public(friend) fun transfer(from: &signer, to: address, amount: u64)  acquires CoinCapabilities {
        coin::transfer<Coin>(from, to, amount);

        let capabilities = borrow_global_mut<CoinCapabilities>(@movement_gaming);
        event::emit_event<TransferEvent>(&mut capabilities.transfer_events, TransferEvent {
            from: signer::address_of(from),
            to,
            amount,
        })
    }

    fun try_register_coin(sender: &signer) {
        let sender_addr = signer::address_of(sender);
        if (!coin::is_account_registered<Coin>(sender_addr)) {
            coin::register<Coin>(sender);
        }
    }

    #[test(deployer=@movement_gaming)]
    fun test_init(deployer: &signer) {
        init_for_testing(deployer);
        assert!(exists<CoinCapabilities>(signer::address_of(deployer)), 0);
    }

    #[test(deployer=@movement_gaming)]
    fun test_mint(deployer: &signer) acquires CoinCapabilities {
        init_for_testing(deployer);
        let balance_before_mint = coin::balance<Coin>(signer::address_of(deployer));
        assert!(balance_before_mint == 0, 0);

        let amount = 100_000_000;
        mint_to(deployer, amount);

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