// REVIEW: Suggest rename repository to momo_movement
module movement_gaming::gaming {
    use std::bcs;
    use std::signer;
    use std::string;
    use aptos_std::table_with_length;
    use aptos_std::table_with_length::TableWithLength;
    use aptos_framework::account;
    use aptos_framework::account::{SignerCapability};
    use aptos_framework::event;
    use aptos_framework::event::EventHandle;

    use movement_gaming::momo_coin;
    use movement_gaming::role::only_admin;

    #[test_only]
    use std::string::utf8;
    #[test_only]
    use aptos_framework::coin;
    #[test_only]
    use movement_gaming::role;

    // error codes
    const E_RESOURCE_ACCOUNT_ALREADY_EXIST: u64 = 1;
    const E_RESOURCE_ACCOUNT_NOT_EXIST: u64 = 2;

    struct ResourceAccountCreateEvent has drop, store {
        resource_address: address
    }

    // REVIEW: Typo
    struct ReferralBounsEvent has drop, store {
        inviter: address,
        invitee: address,
        amount: u64
    }

    // REVIEW: Suggest rename to MomoGlobals/MomoConfig
    struct Gaming has key {
        resource_account_mapping: TableWithLength<address, SignerCapability>,

        resource_account_create_events: EventHandle<ResourceAccountCreateEvent>,
        // REVIEW: Typo: evnets
        referral_bonus_evnets: EventHandle<ReferralBounsEvent>,
    }

    fun init_module(sender: &signer) {
        move_to(sender, Gaming {
            resource_account_mapping: table_with_length::new(),

            resource_account_create_events: account::new_event_handle<ResourceAccountCreateEvent>(sender),
            referral_bonus_evnets: account::new_event_handle<ReferralBounsEvent>(sender),
        })
    }

    public fun create_resource_account(sender: &signer, user_account_hash: string::String): address acquires Gaming {
        only_admin(sender);

        // calculate resource address.
        let user_account_bytes = bcs::to_bytes(&user_account_hash);
        let resource_address = account::create_resource_address(&signer::address_of(sender), user_account_bytes);

        let gaming = borrow_global_mut<Gaming>(@movement_gaming);
        assert!(!table_with_length::contains(&gaming.resource_account_mapping, resource_address), E_RESOURCE_ACCOUNT_ALREADY_EXIST);

        let user_account_bytes = bcs::to_bytes(&user_account_hash);
        let (_, resource_signer_cap) = account::create_resource_account(sender, user_account_bytes);
        table_with_length::add(&mut gaming.resource_account_mapping, resource_address, resource_signer_cap);

        event::emit_event<ResourceAccountCreateEvent>(&mut gaming.resource_account_create_events, ResourceAccountCreateEvent {
            resource_address,
        });

        // REVIEW: There is no point to return a value here.
        resource_address
    }

    // REVIEW: user_account_hash -> use the hash of { 'type': 'telegram', 'telegram_id': '12345' }
    //         and our backend keeps the reverse map.
    // REVIEW: No return
    public fun try_get_user_resource_account(sender: &signer, user_account_hash: string::String): address acquires Gaming {
        let user_account_bytes = bcs::to_bytes(&user_account_hash);
        let resource_address = account::create_resource_address(&signer::address_of(sender), user_account_bytes);

        let gaming = borrow_global<Gaming>(@movement_gaming);
        assert!(table_with_length::contains(&gaming.resource_account_mapping, resource_address), E_RESOURCE_ACCOUNT_NOT_EXIST);

        resource_address
    }

    public fun mint_token(sender: &signer, receipt: address, amount: u64) acquires Gaming {
        only_admin(sender);

        let gaming = borrow_global_mut<Gaming>(@movement_gaming);
        assert!(table_with_length::contains(&gaming.resource_account_mapping, receipt), E_RESOURCE_ACCOUNT_NOT_EXIST);

        let receipt_cap = table_with_length::borrow(&gaming.resource_account_mapping, receipt);
        let receipt_signer = &account::create_signer_with_capability(receipt_cap);
        momo_coin::mint_to(receipt_signer, amount);
    }

    public fun transfer_token(sender: &signer, from: address, to: address, amount: u64) acquires Gaming {
        only_admin(sender);

        let gaming = borrow_global_mut<Gaming>(@movement_gaming);
        assert!(table_with_length::contains(&gaming.resource_account_mapping, from), E_RESOURCE_ACCOUNT_NOT_EXIST);

        let from_cap = table_with_length::borrow(&gaming.resource_account_mapping, from);
        let from_signer = &account::create_signer_with_capability(from_cap);
        momo_coin::transfer(from_signer, to, amount);
    }

    // REVIEW: Only add some points for inviter
    public fun referral_bouns(sender: &signer, inviter: address, invitee: address, amount: u64) acquires Gaming {
        only_admin(sender);

        let gaming = borrow_global_mut<Gaming>(@movement_gaming);
        assert!(table_with_length::contains(&gaming.resource_account_mapping, inviter), E_RESOURCE_ACCOUNT_NOT_EXIST);
        assert!(table_with_length::contains(&gaming.resource_account_mapping, invitee), E_RESOURCE_ACCOUNT_NOT_EXIST);

        let inviter_cap = table_with_length::borrow(&gaming.resource_account_mapping, inviter);
        let inviter_signer = &account::create_signer_with_capability(inviter_cap);
        momo_coin::mint_to(inviter_signer, amount);

        let invitee_cap = table_with_length::borrow(&gaming.resource_account_mapping, invitee);
        let invitee_signer = &account::create_signer_with_capability(invitee_cap);
        momo_coin::mint_to(invitee_signer, amount);

        event::emit_event<ReferralBounsEvent>(&mut gaming.referral_bonus_evnets, ReferralBounsEvent { inviter, invitee, amount });
    }

    #[test(deployer=@movement_gaming)]
    fun test_init(deployer: &signer) {
        init_for_testing(deployer);
        assert!(exists<Gaming>(signer::address_of(deployer)), 0);
    }

    #[test(deployer=@movement_gaming)]
    fun test_get_or_create_resource_account(deployer: &signer) acquires Gaming {
        init_for_testing(deployer);

        let user_account_hash = utf8(b"hello world");
        let resource_address1 = create_resource_account(deployer, user_account_hash);

        let resource_address2 = try_get_user_resource_account(deployer, user_account_hash);
        assert!(resource_address1 == resource_address2, 0);
    }

    #[test(deployer = @movement_gaming, attacker = @test_attacker)]
    #[expected_failure]
    fun test_get_or_create_resource_account_by_attacker(deployer: &signer, attacker: &signer) acquires Gaming {
        init_for_testing(deployer);

        let user_account_hash = utf8(b"hello world");
        create_resource_account(attacker, user_account_hash);
    }

    #[test(deployer=@movement_gaming)]
    fun test_mint_token(deployer: &signer) acquires Gaming {
        init_for_testing(deployer);

        let user_account_hash = utf8(b"hello world");
        let resource_address = create_resource_account(deployer, user_account_hash);

        let coin_balance_before_deposit = coin::balance<momo_coin::Coin>(resource_address);
        assert!(coin_balance_before_deposit == 0, 0);

        let mint_amount = 100_000_000;
        mint_token(deployer, resource_address, mint_amount);

        let coin_balance_after_deposit = coin::balance<momo_coin::Coin>(resource_address);
        assert!(coin_balance_after_deposit == mint_amount, 1);
    }

    #[test(deployer = @movement_gaming, resource_address = @test_attacker)]
    #[expected_failure(abort_code = E_RESOURCE_ACCOUNT_NOT_EXIST)]
    fun test_mint_token_with_invalid_resouce_account(deployer: &signer, resource_address: &signer) acquires Gaming {
        init_for_testing(deployer);

        let mint_amount = 100_000_000;
        mint_token(deployer, signer::address_of(resource_address), mint_amount);
    }

    #[test(deployer=@movement_gaming)]
    fun test_transfer(deployer: &signer) acquires Gaming {
        init_for_testing(deployer);

        let resource_address1 = create_resource_account(deployer, utf8(b"addr1"));
        let reciver = &account::create_account_for_test(@test_attacker);


        let mint_amount = 100_000_000;
        mint_token(deployer, resource_address1, mint_amount);

        let transfer_amount = 25_000_000;
        coin::register<momo_coin::Coin>(reciver);
        transfer_token(deployer, resource_address1, @test_attacker, transfer_amount);

        let balance1 = coin::balance<momo_coin::Coin>(resource_address1);
        let balance2 = coin::balance<momo_coin::Coin>(@test_attacker);
        assert!(balance1 == mint_amount - transfer_amount, 1);
        assert!(balance2 == transfer_amount, 2);
    }

    #[test(deployer=@movement_gaming)]
    fun test_referral_bouns(deployer: &signer) acquires Gaming {
        init_for_testing(deployer);

        let resource_address1 = create_resource_account(deployer, utf8(b"addr1"));
        let resource_address2 = create_resource_account(deployer, utf8(b"addr2"));

        let amount = 100_000_000;
        referral_bouns(deployer, resource_address1, resource_address2, amount);

        let balance1 = coin::balance<momo_coin::Coin>(resource_address1);
        let balance2 = coin::balance<momo_coin::Coin>(resource_address2);
        assert!(balance1 == amount, 1);
        assert!(balance2 == amount, 2);
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