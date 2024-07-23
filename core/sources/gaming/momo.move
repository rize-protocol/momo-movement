module momo_movement::momo {
    use std::bcs;
    use std::signer;
    use std::string;
    use std::vector;
    use aptos_std::table_with_length;
    use aptos_std::table_with_length::TableWithLength;
    use aptos_framework::account;
    use aptos_framework::account::{SignerCapability};
    use aptos_framework::coin;
    use aptos_framework::event;
    use aptos_framework::event::EventHandle;

    use momo_movement::momo_coin;
    use momo_movement::role::{only_admin, get_admin};

    #[test_only]
    use std::string::utf8;
    #[test_only]
    use aptos_framework::coin;
    #[test_only]
    use momo_movement::role;

    // error codes
    const E_RESOURCE_ACCOUNT_ALREADY_EXIST: u64 = 1;
    const E_RESOURCE_ACCOUNT_NOT_EXIST: u64 = 2;

    struct ResourceAccountCreateEvent has drop, store {
        user_account_hash: string::String,
        resource_address: address
    }

    struct ReferralBonusEvent has drop, store {
        inviter: address,
        amount: u64
    }

    struct MomoGlobals has key {
        resource_account_mapping: TableWithLength<address, SignerCapability>,

        resource_account_create_events: EventHandle<ResourceAccountCreateEvent>,
        referral_bonus_events: EventHandle<ReferralBonusEvent>,
    }

    fun init_module(sender: &signer) {
        move_to(sender, MomoGlobals {
            resource_account_mapping: table_with_length::new(),

            resource_account_create_events: account::new_event_handle<ResourceAccountCreateEvent>(sender),
            referral_bonus_events: account::new_event_handle<ReferralBonusEvent>(sender),
        })
    }

    public entry fun create_resource_account(sender: &signer, user_account_hash: string::String) acquires MomoGlobals {
        only_admin(sender);

        let resource_address = calculate_resource_account_address(user_account_hash);

        let global = borrow_global_mut<MomoGlobals>(@momo_movement);
        assert!(!table_with_length::contains(&global.resource_account_mapping, resource_address), E_RESOURCE_ACCOUNT_ALREADY_EXIST);

        let user_account_bytes = bcs::to_bytes(&user_account_hash);
        let (_, resource_signer_cap) = account::create_resource_account(sender, user_account_bytes);
        table_with_length::add(&mut global.resource_account_mapping, resource_address, resource_signer_cap);

        event::emit_event<ResourceAccountCreateEvent>(&mut global.resource_account_create_events, ResourceAccountCreateEvent {
            user_account_hash,
            resource_address,
        });
    }

    #[view]
    public fun try_get_user_resource_account(user_account_hash: string::String): address acquires MomoGlobals {
        let resource_address = calculate_resource_account_address(user_account_hash);
        let user_signer = &try_get_resource_account_signer(resource_address);

        signer::address_of(user_signer)
    }

    #[view]
    public fun resource_account_exists(resource_account: address) : bool acquires MomoGlobals {
        let global = borrow_global<MomoGlobals>(@momo_movement);
        table_with_length::contains(&global.resource_account_mapping, resource_account)
    }

    #[view]
    public fun momo_balance(resource_account: address): u64 {
        coin::balance<momo_coin::Coin>(resource_account)
    }

    public entry fun mint_token(sender: &signer, receipt: address, amount: u64) acquires MomoGlobals {
        only_admin(sender);

        let receipt_signer = &try_get_resource_account_signer(receipt);
        momo_coin::mint_internal(receipt_signer, amount);
    }

    public entry fun batch_mint_token(sender: &signer, receipts: vector<address>, amount: u64) acquires MomoGlobals {
        only_admin(sender);

        let num_receipt = vector::length(&receipts);
        let i = 0;
        while (i < num_receipt) {
            let receipt = *vector::borrow(&receipts, i);
            mint_token(sender, receipt, amount);
            i = i + 1;
        };
    }

    public entry fun transfer_token(sender: &signer, from: address, to: address, amount: u64) acquires MomoGlobals {
        only_admin(sender);

        let from_signer = &try_get_resource_account_signer(from);
        momo_coin::transfer(from_signer, to, amount);
    }

    public entry fun referral_bonus(sender: &signer, inviter: address, amount: u64) acquires MomoGlobals {
        only_admin(sender);

        let inviter_signer = &try_get_resource_account_signer(inviter);
        momo_coin::mint_internal(inviter_signer, amount);

        let global = borrow_global_mut<MomoGlobals>(@momo_movement);
        event::emit_event<ReferralBonusEvent>(&mut global.referral_bonus_events, ReferralBonusEvent { inviter, amount });
    }

    fun calculate_resource_account_address(user_account_hash: string::String): address {
        let owner = get_admin();
        let user_account_bytes = bcs::to_bytes(&user_account_hash);
        account::create_resource_address(&owner, user_account_bytes)
    }

    fun try_get_resource_account_signer(resource_account: address): signer acquires MomoGlobals {
        let global = borrow_global<MomoGlobals>(@momo_movement);
        assert!(table_with_length::contains(&global.resource_account_mapping, resource_account), E_RESOURCE_ACCOUNT_NOT_EXIST);

        let resource_account_gap = table_with_length::borrow(&global.resource_account_mapping, resource_account);
        account::create_signer_with_capability(resource_account_gap)
    }

    #[test(deployer=@momo_movement)]
    fun test_init(deployer: &signer) {
        init_for_testing(deployer);
        assert!(exists<MomoGlobals>(signer::address_of(deployer)), 0);
    }

    #[test(deployer=@momo_movement)]
    fun test_get_or_create_resource_account(deployer: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let user_account_hash = utf8(b"hello world");
        create_resource_account(deployer, user_account_hash);
        try_get_user_resource_account(user_account_hash);
    }

    #[test(deployer = @momo_movement, attacker = @test_attacker)]
    #[expected_failure]
    fun test_get_or_create_resource_account_by_attacker(deployer: &signer, attacker: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let user_account_hash = utf8(b"hello world");
        create_resource_account(attacker, user_account_hash);
    }

    #[test(deployer=@momo_movement)]
    fun test_mint_token(deployer: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let user_account_hash = utf8(b"hello world");
        create_resource_account(deployer, user_account_hash);
        let resource_address = try_get_user_resource_account(user_account_hash);

        let coin_balance_before_deposit = coin::balance<momo_coin::Coin>(resource_address);
        assert!(coin_balance_before_deposit == 0, 0);

        let mint_amount = 100_000_000;
        mint_token(deployer, resource_address, mint_amount);

        let coin_balance_after_deposit = coin::balance<momo_coin::Coin>(resource_address);
        assert!(coin_balance_after_deposit == mint_amount, 1);
    }

    #[test(deployer=@momo_movement)]
    #[expected_failure(abort_code = E_RESOURCE_ACCOUNT_NOT_EXIST)]
    fun test_batch_mint_token_not_exists(deployer: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let mint_amount = 100_000_000;

        let user_account1 = @0x123;
        let user_account2 = @0x345;

        let receipts = vector::empty<address>();
        vector::push_back(&mut receipts, user_account1);
        vector::push_back(&mut receipts, user_account2);

        batch_mint_token(deployer, receipts, mint_amount);
    }

    #[test(deployer=@momo_movement)]
    fun test_batch_mint_token(deployer: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let mint_amount = 100_000_000;

        create_resource_account(deployer, utf8(b"addr1"));
        create_resource_account(deployer, utf8(b"addr2"));
        let user_account1 = try_get_user_resource_account(utf8(b"addr1"));
        let user_account2 = try_get_user_resource_account(utf8(b"addr2"));

        let receipts = vector::empty<address>();
        vector::push_back(&mut receipts, user_account1);
        vector::push_back(&mut receipts, user_account2);

        batch_mint_token(deployer, receipts, mint_amount);

        let user_balance1 = coin::balance<momo_coin::Coin>(user_account1);
        let user_balance2 = coin::balance<momo_coin::Coin>(user_account2);

        assert!(user_balance1 == mint_amount, 0);
        assert!(user_balance2 == mint_amount, 1);
    }

    #[test(deployer = @momo_movement, resource_address = @test_attacker)]
    #[expected_failure(abort_code = E_RESOURCE_ACCOUNT_NOT_EXIST)]
    fun test_mint_token_with_invalid_resource_account(deployer: &signer, resource_address: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let mint_amount = 100_000_000;
        mint_token(deployer, signer::address_of(resource_address), mint_amount);
    }

    #[test(deployer=@momo_movement)]
    fun test_transfer(deployer: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let user_account_hash = utf8(b"addr1");
        create_resource_account(deployer, user_account_hash);
        let resource_address1 = try_get_user_resource_account(user_account_hash);
        let receiver = &account::create_account_for_test(@test_attacker);


        let mint_amount = 100_000_000;
        mint_token(deployer, resource_address1, mint_amount);

        let transfer_amount = 25_000_000;
        coin::register<momo_coin::Coin>(receiver);
        transfer_token(deployer, resource_address1, @test_attacker, transfer_amount);

        let balance1 = coin::balance<momo_coin::Coin>(resource_address1);
        let balance2 = coin::balance<momo_coin::Coin>(@test_attacker);
        assert!(balance1 == mint_amount - transfer_amount, 1);
        assert!(balance2 == transfer_amount, 2);
    }

    #[test(deployer=@momo_movement)]
    fun test_referral_bonus(deployer: &signer) acquires MomoGlobals {
        init_for_testing(deployer);

        let user_account_hash1 = utf8(b"addr1");
        create_resource_account(deployer, user_account_hash1);
        let inviter = try_get_user_resource_account(user_account_hash1);

        let amount = 100_000_000;
        referral_bonus(deployer, inviter, amount);

        let inviterBalance = coin::balance<momo_coin::Coin>(inviter);
        assert!(inviterBalance == amount, 1);
    }

    #[test_only]
    public fun init_for_testing(sender: &signer) {
        if (!account::exists_at(signer::address_of(sender))) {
            account::create_account_for_test(signer::address_of(sender));
        };
        init_module(sender);
        momo_coin::init_for_testing(sender);
        role::init_for_testing(sender);
    }
}
